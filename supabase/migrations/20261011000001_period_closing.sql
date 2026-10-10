-- Closing snapshots, config advancement and audit are committed atomically.
CREATE TABLE public.year_end_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year varchar(4) NOT NULL UNIQUE,
  vendor_snapshots jsonb NOT NULL,
  monthly_snapshots jsonb NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES public.app_users(id)
);
ALTER TABLE public.year_end_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "year_end_runs: authenticated read" ON public.year_end_runs
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.year_end_runs TO authenticated;

CREATE OR REPLACE FUNCTION public.close_ap_month(p_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c config%ROWTYPE;
  p periods%ROWTYPE;
  v record;
  b record;
  n integer := 0;
  actor uuid;
  next_month text;
  msg text;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(is_admin(), false) THEN
    RAISE EXCEPTION 'Administrator permission required';
  END IF;
  SELECT id INTO actor FROM app_users WHERE auth_uid = auth.uid() AND is_active;
  IF actor IS NULL THEN RAISE EXCEPTION 'Active user required'; END IF;
  SELECT * INTO c FROM config ORDER BY company_code LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR c.period_year IS NULL OR c.period_month IS NULL THEN
    RAISE EXCEPTION 'Set the current accounting month and year in Company Settings first';
  END IF;
  SELECT * INTO p FROM periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Period not found'; END IF;
  IF p.closed THEN RAISE EXCEPTION 'Period is already closed'; END IF;
  IF p.period_year <> c.period_year OR p.period_month <> c.period_month THEN
    RAISE EXCEPTION 'Only the current accounting period can be closed';
  END IF;
  IF EXISTS (SELECT 1 FROM year_end_runs WHERE period_year = p.period_year) THEN
    RAISE EXCEPTION 'Fiscal year is already closed';
  END IF;
  IF EXISTS (SELECT 1 FROM periods WHERE NOT closed
    AND (period_year, period_month) < (p.period_year, p.period_month)) THEN
    RAISE EXCEPTION 'Close earlier periods first';
  END IF;
  LOCK TABLE invoices, payments IN SHARE ROW EXCLUSIVE MODE;
  -- Delphi checks unfinished documents through the end of the selected month.
  IF EXISTS (SELECT 1 FROM invoices WHERE doc_date <= p.date_to
    AND status::text IN ('draft', 'pending_approval', 'rejected')) THEN
    RAISE EXCEPTION 'Unfinished invoices or debit notes exist through this period';
  END IF;
  IF EXISTS (SELECT 1 FROM payments WHERE doc_date <= p.date_to
    AND status::text IN ('draft', 'pending_approval', 'approved')) THEN
    RAISE EXCEPTION 'Uncompleted payments exist through this period';
  END IF;
  msg := validate_period_can_close(p.period_year, p.period_month);
  IF msg IS NOT NULL THEN RAISE EXCEPTION '%', msg; END IF;
  SELECT period_month INTO next_month FROM periods
    WHERE period_year = p.period_year AND period_month > p.period_month
    ORDER BY period_month LIMIT 1;
  FOR v IN SELECT id, code FROM vendors ORDER BY code FOR UPDATE LOOP
    SELECT * INTO b FROM vendor_period_balance(v.id, p.period_year, p.period_month);
    INSERT INTO vendor_monthly_balances
      (vendor_id,period_year,period_month,open_amount,open_balance,inv_amount,dr_amount,paid_amount,balance)
    VALUES (v.id,p.period_year,p.period_month,b.opening_balance,b.opening_balance,b.invoiced,b.debit_notes,b.paid,b.outstanding)
    ON CONFLICT (vendor_id,period_year,period_month) DO UPDATE SET
      open_amount=EXCLUDED.open_amount,open_balance=EXCLUDED.open_balance,
      inv_amount=EXCLUDED.inv_amount,dr_amount=EXCLUDED.dr_amount,
      paid_amount=EXCLUDED.paid_amount,balance=EXCLUDED.balance,updated_at=now();
    INSERT INTO month_end
      (supplier_code,period_year,period_month,open_amount,open_balance,inv_amount,dr_amount,paid_amount,balance)
    VALUES (v.code,p.period_year,p.period_month,b.opening_balance,b.opening_balance,b.invoiced,b.debit_notes,b.paid,b.outstanding)
    ON CONFLICT (supplier_code,period_year,period_month) DO UPDATE SET
      open_amount=EXCLUDED.open_amount,open_balance=EXCLUDED.open_balance,
      inv_amount=EXCLUDED.inv_amount,dr_amount=EXCLUDED.dr_amount,
      paid_amount=EXCLUDED.paid_amount,balance=EXCLUDED.balance,updated_at=now();
    UPDATE vendors SET open_amount=b.outstanding WHERE id=v.id;
    n := n + 1;
  END LOOP;
  UPDATE periods SET closed=true,closed_at=now(),closed_by=actor WHERE id=p.id;
  -- Leave the final period selected until Year End, as in Delphi.
  IF next_month IS NOT NULL THEN
    UPDATE config SET period_month=next_month,updated_at=now() WHERE id=c.id;
  END IF;
  PERFORM recalculate_vendor_balance(code) FROM vendors;
  INSERT INTO audit_logs(table_name,record_id,action,performed_by,detail,new_data)
    VALUES ('periods',p.id,'update',actor,'Month end completed',
      jsonb_build_object('closed',true,'year',p.period_year,'month',p.period_month));
  RETURN jsonb_build_object('periodId',p.id,'periodYear',p.period_year,
    'periodMonth',p.period_month,'vendorsProcessed',n,'balancesCreated',n);
END $$;

CREATE OR REPLACE FUNCTION public.close_ap_year(p_year text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c config%ROWTYPE;
  actor uuid;
  run_id uuid;
  next_year text;
  last_month text;
  n integer;
  inserted integer;
  i integer;
  reset_columns text := '';
BEGIN
  IF p_year !~ '^[1-9][0-9]{3}$' OR p_year::integer >= 9999 THEN
    RAISE EXCEPTION 'Invalid fiscal year';
  END IF;
  IF auth.uid() IS NULL OR NOT coalesce(is_admin(), false) THEN
    RAISE EXCEPTION 'Administrator permission required';
  END IF;
  SELECT id INTO actor FROM app_users WHERE auth_uid=auth.uid() AND is_active;
  IF actor IS NULL THEN RAISE EXCEPTION 'Active user required'; END IF;
  SELECT * INTO c FROM config ORDER BY company_code LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Company configuration not found'; END IF;
  IF EXISTS (SELECT 1 FROM year_end_runs WHERE period_year=p_year) THEN
    RAISE EXCEPTION 'Fiscal year is already closed';
  END IF;
  PERFORM id FROM periods WHERE period_year=p_year ORDER BY period_month FOR UPDATE;
  SELECT max(period_month) INTO last_month FROM periods WHERE period_year=p_year;
  IF last_month IS NULL THEN RAISE EXCEPTION 'No periods found for this year'; END IF;
  IF c.period_year IS DISTINCT FROM p_year OR c.period_month IS DISTINCT FROM last_month THEN
    RAISE EXCEPTION 'Year End requires the current year final period';
  END IF;
  IF EXISTS (SELECT 1 FROM periods WHERE period_year=p_year AND NOT closed) THEN
    RAISE EXCEPTION 'Complete Month End for every period before Year End';
  END IF;
  IF EXISTS (SELECT 1 FROM vendors v CROSS JOIN periods p
    WHERE p.period_year=p_year AND NOT EXISTS (
      SELECT 1 FROM vendor_monthly_balances b WHERE b.vendor_id=v.id
        AND b.period_year=p.period_year AND b.period_month=p.period_month)) THEN
    RAISE EXCEPTION 'Monthly balance snapshots are missing; complete Month End first';
  END IF;
  LOCK TABLE invoices, payments IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM invoices WHERE doc_date <= (SELECT max(date_to) FROM periods WHERE period_year=p_year)
    AND status::text IN ('draft','pending_approval','rejected'))
    OR EXISTS (SELECT 1 FROM payments WHERE doc_date <= (SELECT max(date_to) FROM periods WHERE period_year=p_year)
    AND status::text IN ('draft','pending_approval','approved')) THEN
    RAISE EXCEPTION 'Unfinished transactions remain in this fiscal year';
  END IF;
  PERFORM id FROM vendors ORDER BY code FOR UPDATE;
  next_year := (p_year::integer + 1)::text;
  IF EXISTS (SELECT 1 FROM periods WHERE period_year=next_year AND closed) THEN
    RAISE EXCEPTION 'Next fiscal year already contains closed periods';
  END IF;
  INSERT INTO year_end_runs(period_year,vendor_snapshots,monthly_snapshots,closed_by)
    VALUES (p_year,
      coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY code) FROM vendors v),'[]'),
      coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY period_month,vendor_id)
        FROM vendor_monthly_balances b WHERE period_year=p_year),'[]'),actor)
    RETURNING id INTO run_id;
  INSERT INTO periods(period_year,period_month,date_from,date_to)
    SELECT next_year,to_char(m,'FM00'),make_date(next_year::integer,m,1),
      (make_date(next_year::integer,m,1)+interval '1 month - 1 day')::date
    FROM generate_series(1,12) m ON CONFLICT(period_year,period_month) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  INSERT INTO vendor_monthly_balances(vendor_id,period_year,period_month,open_amount,open_balance,balance)
    SELECT vendor_id,next_year,'01',balance,balance,balance FROM vendor_monthly_balances
    WHERE period_year=p_year AND period_month=last_month
    ON CONFLICT(vendor_id,period_year,period_month) DO UPDATE SET
      open_amount=EXCLUDED.open_amount,open_balance=EXCLUDED.open_balance,
      balance=EXCLUDED.balance,updated_at=now();
  -- Archive legacy annual buckets before resetting them.
  FOR i IN 1..15 LOOP
    reset_columns := reset_columns || format('amt_%s=0,pay_%s=0,',lpad(i::text,2,'0'),lpad(i::text,2,'0'));
  END LOOP;
  EXECUTE 'UPDATE vendors SET ' || reset_columns || 'total_amount=0,total_payment=0';
  UPDATE config SET period_year=next_year,period_month='01',updated_at=now() WHERE id=c.id;
  -- Recalculate summaries against January, preserving the closed-year checkpoint.
  PERFORM recalculate_vendor_balance(code) FROM vendors;
  SELECT count(*) INTO n FROM vendors;
  INSERT INTO audit_logs(table_name,record_id,action,performed_by,detail,new_data)
    VALUES ('year_end_runs',run_id,'create',actor,'Year end completed',
      jsonb_build_object('year',p_year,'nextYear',next_year,'vendorsProcessed',n));
  RETURN jsonb_build_object('periodsClosed',0,'vendorsProcessed',n,
    'nextYearCreated',inserted>0,'nextYear',next_year);
END $$;

REVOKE ALL ON FUNCTION public.close_ap_month(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_ap_year(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_ap_month(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_ap_year(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reopen_ap_period(p_period_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c config%ROWTYPE; p periods%ROWTYPE; actor uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(is_admin(),false) THEN
    RAISE EXCEPTION 'Administrator permission required';
  END IF;
  SELECT id INTO actor FROM app_users WHERE auth_uid=auth.uid() AND is_active;
  IF actor IS NULL THEN RAISE EXCEPTION 'Active user required'; END IF;
  SELECT * INTO c FROM config ORDER BY company_code LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Company configuration not found'; END IF;
  SELECT * INTO p FROM periods WHERE id=p_period_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Period not found'; END IF;
  IF NOT p.closed THEN RAISE EXCEPTION 'Period is already open'; END IF;
  IF EXISTS (SELECT 1 FROM year_end_runs WHERE period_year=p.period_year)
    OR EXISTS (SELECT 1 FROM periods WHERE closed
      AND (period_year,period_month) > (p.period_year,p.period_month)) THEN
    RAISE EXCEPTION 'Cannot reopen a period after a later close or Year End';
  END IF;
  UPDATE periods SET closed=false,closed_at=NULL,closed_by=NULL WHERE id=p.id;
  UPDATE config SET period_year=p.period_year,period_month=p.period_month,updated_at=now() WHERE id=c.id;
  PERFORM recalculate_vendor_balance(code) FROM vendors;
  INSERT INTO audit_logs(table_name,record_id,action,performed_by,detail)
    VALUES ('periods',p.id,'update',actor,'Period reopened');
END $$;
REVOKE ALL ON FUNCTION public.reopen_ap_period(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_ap_period(uuid) TO authenticated;

-- Preview the selected period/year rather than the current vendor summary.
CREATE OR REPLACE FUNCTION public.ap_period_summary(p_year text, p_month text DEFAULT NULL)
RETURNS TABLE(code text,name_en text,name_th text,total_amount numeric,total_payment numeric,balance numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT v.code::text,v.name_en::text,v.name_th::text,
    coalesce(sum(b.invoiced),0),coalesce(sum(b.paid),0),
    (array_agg(b.outstanding ORDER BY p.period_month DESC))[1]
  FROM vendors v CROSS JOIN periods p
  CROSS JOIN LATERAL vendor_period_balance(v.id,p.period_year,p.period_month) live
  CROSS JOIN LATERAL (
    SELECT CASE WHEN p.closed AND s.id IS NOT NULL THEN s.inv_amount ELSE live.invoiced END invoiced,
      CASE WHEN p.closed AND s.id IS NOT NULL THEN s.paid_amount ELSE live.paid END paid,
      CASE WHEN p.closed AND s.id IS NOT NULL THEN s.balance ELSE live.outstanding END outstanding
    FROM (SELECT 1) dummy LEFT JOIN vendor_monthly_balances s
      ON s.vendor_id=v.id AND s.period_year=p.period_year AND s.period_month=p.period_month
  ) b
  WHERE p.period_year=p_year AND (p_month IS NULL OR p.period_month=p_month)
  GROUP BY v.id,v.code,v.name_en,v.name_th ORDER BY v.code;
$$;
REVOKE ALL ON FUNCTION public.ap_period_summary(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ap_period_summary(text,text) TO authenticated;
