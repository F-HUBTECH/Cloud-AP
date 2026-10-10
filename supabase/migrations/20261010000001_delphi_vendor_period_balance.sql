-- Match Delphi EMonthEnd: opbal + amt - dr - paid, by document/payment date.
-- ap_type_code is also used for user-defined AP categories (and may be NULL).
-- A normal voucher must not be excluded just because it is not labelled AP/ADJ.
CREATE OR REPLACE FUNCTION public.vendor_period_balance(
  p_vendor_id uuid, p_year text, p_month text
) RETURNS TABLE (
  opening_balance numeric, invoiced numeric, debit_notes numeric,
  paid numeric, outstanding numeric
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_start date := make_date(p_year::integer, p_month::integer, 1);
  v_end date := (v_start + interval '1 month')::date;
  v_anchor_date date;
  v_anchor_balance numeric := 0;
  v_code text;
BEGIN
  SELECT code INTO v_code FROM vendors WHERE id = p_vendor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor not found'; END IF;

  -- A closed period is a balance-forward checkpoint. Add any intervening
  -- months when there is a gap; do not add transactions already in the snapshot.
  SELECT s.next_date, s.balance INTO v_anchor_date, v_anchor_balance
  FROM (
    SELECT (make_date(b.period_year::integer, b.period_month::integer, 1)
            + interval '1 month')::date AS next_date, b.balance, 0 AS priority
    FROM vendor_monthly_balances b
    JOIN periods p USING (period_year, period_month)
    WHERE b.vendor_id = p_vendor_id AND p.closed
      AND make_date(b.period_year::integer, b.period_month::integer, 1) < v_start
    UNION ALL
    SELECT (make_date(b.period_year::integer, b.period_month::integer, 1)
            + interval '1 month')::date, b.balance, 1
    FROM month_end b
    JOIN periods p USING (period_year, period_month)
    WHERE b.supplier_code = v_code AND p.closed
      AND make_date(b.period_year::integer, b.period_month::integer, 1) < v_start
  ) s ORDER BY s.next_date DESC, s.priority LIMIT 1;

  -- Preserve an explicitly imported opening balance in the first period.
  IF v_anchor_date IS NULL THEN
    SELECT s.open_balance INTO v_anchor_balance FROM (
      SELECT b.open_balance, 0 AS priority FROM vendor_monthly_balances b
       WHERE b.vendor_id = p_vendor_id AND b.period_year = p_year
         AND b.period_month = lpad(p_month, 2, '0') AND b.open_balance <> 0
      UNION ALL
      SELECT b.open_balance, 1 FROM month_end b
       WHERE b.supplier_code = v_code AND b.period_year = p_year
         AND b.period_month = lpad(p_month, 2, '0') AND b.open_balance <> 0
    ) s ORDER BY s.priority LIMIT 1;
    IF FOUND THEN v_anchor_date := v_start; END IF;
  END IF;

  RETURN QUERY
  WITH movements AS (
    SELECT i.doc_date AS movement_date,
           CASE WHEN upper(coalesce(i.ap_type_code, '')) IN ('ADN','ACN','DR','B')
                     OR (coalesce(i.ap_type_code, '') = ''
                         AND i.doc_number ~* '^(ADN|ACN)')
                THEN 0 ELSE coalesce(i.total_amount, 0) END AS inv,
           CASE WHEN upper(coalesce(i.ap_type_code, '')) IN ('ADN','ACN','DR','B')
                     OR (coalesce(i.ap_type_code, '') = ''
                         AND i.doc_number ~* '^(ADN|ACN)')
                THEN abs(coalesce(i.total_amount, 0)) ELSE 0 END AS dn,
           0::numeric AS payment
      FROM invoices i
     WHERE i.supplier_id = p_vendor_id
       AND i.status::text IN ('approved', 'posted', 'paid')
    UNION ALL
    SELECT coalesce((p.paid_at AT TIME ZONE 'Asia/Bangkok')::date, p.doc_date),
           0::numeric, 0::numeric, coalesce(p.total_amount, 0)
      FROM payments p
     WHERE p.supplier_id = p_vendor_id AND p.status = 'paid'
  ), totals AS (
    SELECT coalesce(v_anchor_balance, 0) + coalesce(sum(inv - dn - payment)
             FILTER (WHERE movement_date < v_start
               AND (v_anchor_date IS NULL OR movement_date >= v_anchor_date)), 0) AS op,
           coalesce(sum(inv) FILTER (WHERE movement_date >= v_start), 0) AS iv,
           coalesce(sum(dn) FILTER (WHERE movement_date >= v_start), 0) AS dr,
           coalesce(sum(payment) FILTER (WHERE movement_date >= v_start), 0) AS py
      FROM movements WHERE movement_date < v_end
  ) SELECT op, iv, dr, py, op + iv - dr - py FROM totals;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_vendor_balance(p_vendor_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_year text;
  v_month text;
  v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_balance record;
BEGIN
  SELECT id INTO v_id FROM vendors WHERE code = p_vendor_code;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT period_year, period_month INTO v_year, v_month FROM config LIMIT 1;
  v_year := coalesce(nullif(v_year, ''), to_char(v_today, 'YYYY'));
  v_month := coalesce(nullif(v_month, ''), to_char(v_today, 'MM'));
  SELECT * INTO v_balance FROM vendor_period_balance(v_id, v_year, v_month);
  UPDATE vendors SET total_amount = v_balance.invoiced,
                     total_payment = v_balance.paid,
                     open_amount = v_balance.outstanding,
                     deposit_balance = (
                       SELECT coalesce(sum(remaining_amount), 0)
                       FROM deposit_payments WHERE supplier_id = v_id
                         AND status IN ('active', 'applied')
                     ) WHERE id = v_id;
END;
$$;

-- Keep summary fields in sync for direct UI writes and approval transitions,
-- including changes of supplier and cancellations.
CREATE OR REPLACE FUNCTION public.refresh_vendor_period_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM recalculate_vendor_balance(OLD.supplier_code);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM recalculate_vendor_balance(NEW.supplier_code);
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER invoices_refresh_vendor_period_balance
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.refresh_vendor_period_balance();
CREATE TRIGGER payments_refresh_vendor_period_balance
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.refresh_vendor_period_balance();

DO $$ DECLARE v record; BEGIN
  FOR v IN SELECT code FROM vendors LOOP
    PERFORM recalculate_vendor_balance(v.code);
  END LOOP;
END $$;
