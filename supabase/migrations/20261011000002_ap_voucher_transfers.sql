-- Voucher transfers are recorded as a source adjustment and a destination
-- obligation. Original invoice/tax data and historical period totals stay intact.
ALTER TABLE public.transfers
  ADD COLUMN source_invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  ADD COLUMN destination_invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  ADD COLUMN adjustment_invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX transfers_active_source ON public.transfers(source_invoice_id)
  WHERE status = 'active' AND source_invoice_id IS NOT NULL;

-- Writes must go through the atomic, permission-checked functions below.
REVOKE INSERT, UPDATE, DELETE ON public.transfers FROM authenticated;

CREATE FUNCTION public.assert_transfer_voucher_unused(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i invoices%ROWTYPE;
BEGIN
  SELECT * INTO i FROM invoices WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AP voucher not found'; END IF;
  IF i.status NOT IN ('approved','posted') OR coalesce(i.balance,0)<=0
     OR coalesce(i.paid_amount,0)<>0 OR coalesce(i.deposit_amount,0)<>0
     OR i.balance IS DISTINCT FROM i.total_amount
     OR upper(coalesce(i.ap_type_code,'')) IN ('ADN','ACN','DR','B')
     OR (coalesce(i.ap_type_code,'')='' AND i.doc_number ~* '^(ADN|ACN)') THEN
    RAISE EXCEPTION 'Select an approved or posted voucher with its full unpaid balance';
  END IF;
  IF EXISTS (SELECT 1 FROM payment_invoices pi JOIN payments p ON p.id=pi.payment_id
             WHERE pi.invoice_id=p_id AND p.status NOT IN ('cancelled','voided','rejected')) THEN
    RAISE EXCEPTION 'Voucher is already assigned to a payment';
  END IF;
  IF EXISTS (SELECT 1 FROM deposit_applications WHERE invoice_id=p_id AND status='active') THEN
    RAISE EXCEPTION 'Voucher has an active deposit application';
  END IF;
  IF EXISTS (SELECT 1 FROM transfers WHERE source_invoice_id=p_id AND status='active') THEN
    RAISE EXCEPTION 'Voucher is already transferred';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_transfer_voucher_unused(uuid) FROM PUBLIC;

CREATE FUNCTION public.transfer_ap_voucher(p_invoice_id uuid, p_to_vendor_id uuid,
  p_transfer_date date, p_remark text) RETURNS public.transfers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid; i invoices%ROWTYPE; v vendors%ROWTYPE; t transfers%ROWTYPE;
  period periods%ROWTYPE; destination uuid; adjustment uuid; journal uuid;
  number text; trade text;
BEGIN
  SELECT id INTO actor FROM app_users WHERE auth_uid=auth.uid() AND is_active;
  IF actor IS NULL OR NOT can_create('VCP') THEN RAISE EXCEPTION 'No permission to transfer AP vouchers'; END IF;
  IF nullif(btrim(p_remark),'') IS NULL OR length(p_remark)>500 THEN RAISE EXCEPTION 'Transfer reason is required (maximum 500 characters)'; END IF;
  -- Same lock order as month end: config, period, vendors, invoice.
  PERFORM 1 FROM config ORDER BY company_code FOR UPDATE;
  SELECT * INTO period FROM periods WHERE p_transfer_date BETWEEN date_from AND date_to FOR UPDATE;
  IF NOT FOUND OR period.closed THEN RAISE EXCEPTION 'Transfer date must be in an open accounting period'; END IF;
  PERFORM id FROM vendors WHERE id IN (p_to_vendor_id, (SELECT supplier_id FROM invoices WHERE id=p_invoice_id)) ORDER BY code FOR UPDATE;
  SELECT * INTO i FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  PERFORM assert_transfer_voucher_unused(p_invoice_id);
  SELECT * INTO v FROM vendors WHERE id=p_to_vendor_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select an active destination vendor'; END IF;
  IF v.id=i.supplier_id THEN RAISE EXCEPTION 'Source and destination vendor cannot be the same'; END IF;
  IF p_transfer_date<i.doc_date THEN RAISE EXCEPTION 'Transfer date cannot precede the source voucher date'; END IF;
  number := next_doc_number('transfers'::varchar,'doc_number'::varchar,'TRF'::varchar,'TRF'::varchar,5);
  SELECT coalesce(nullif(acc_trade,''),'2000') INTO trade FROM config ORDER BY company_code LIMIT 1;
  trade := coalesce(trade,'2000');
  -- These are debt movements, not new expense or VAT recognition.
  INSERT INTO invoices(doc_number,doc_date,supplier_id,supplier_code,ap_type_code,currency,
    total_amount,balance,status,period_year,period_month,remark,created_by,updated_by)
  VALUES(number||'-OUT',p_transfer_date,i.supplier_id,i.supplier_code,'DR',i.currency,
    i.balance,0,'posted',period.period_year,period.period_month,'Transfer out: '||i.doc_number||' — '||p_remark,actor,actor)
  RETURNING id INTO adjustment;
  INSERT INTO invoices(doc_number,doc_date,supplier_id,supplier_code,ap_type_code,currency,
    due_date,wht_code,total_amount,balance,status,period_year,period_month,remark,created_by,updated_by)
  VALUES(number||'-IN',p_transfer_date,v.id,v.code,'TRF',i.currency,
    i.due_date,i.wht_code,i.balance,i.balance,'posted',period.period_year,period.period_month,
    'Transferred from '||i.doc_number||' ('||i.supplier_code||') — '||p_remark,actor,actor)
  RETURNING id INTO destination;
  UPDATE invoices SET balance=0,updated_by=actor WHERE id=i.id;
  INSERT INTO transfers(doc_number,transfer_date,from_vendor_id,from_vendor_code,to_vendor_id,to_vendor_code,
    amount,remark,status,period_year,period_month,created_by,updated_by,
    source_invoice_id,destination_invoice_id,adjustment_invoice_id)
  VALUES(number,p_transfer_date,i.supplier_id,i.supplier_code,v.id,v.code,i.balance,btrim(p_remark),'active',
    period.period_year,period.period_month,actor,actor,i.id,destination,adjustment) RETURNING * INTO t;
  INSERT INTO journal_entries(doc_number,source_type,source_id,doc_date,period_year,period_month,
    description,total_debit,total_credit,created_by)
  VALUES(number,'transfer',t.id,p_transfer_date,period.period_year,period.period_month,
    'Transfer '||i.doc_number||': '||i.supplier_code||' → '||v.code,i.balance,i.balance,actor) RETURNING id INTO journal;
  INSERT INTO journal_entry_lines(journal_entry_id,line_no,gl_account,description,debit,credit) VALUES
    (journal,1,trade,'Transfer out '||i.supplier_code,i.balance,0),
    (journal,2,trade,'Transfer in '||v.code,0,i.balance);
  INSERT INTO audit_logs(table_name,record_id,action,new_data,performed_by,detail)
    VALUES('transfers',t.id,'create',to_jsonb(t),actor,'Transferred AP voucher '||i.doc_number);
  PERFORM recalculate_vendor_balance(i.supplier_code);
  PERFORM recalculate_vendor_balance(v.code);
  RETURN t;
END $$;

CREATE FUNCTION public.cancel_ap_voucher_transfer(p_transfer_id uuid) RETURNS public.transfers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid; t transfers%ROWTYPE; period periods%ROWTYPE;
BEGIN
  SELECT id INTO actor FROM app_users WHERE auth_uid=auth.uid() AND is_active;
  IF actor IS NULL OR NOT can_delete('VCP') THEN RAISE EXCEPTION 'No permission to cancel transfers'; END IF;
  PERFORM 1 FROM config ORDER BY company_code FOR UPDATE;
  SELECT * INTO t FROM transfers WHERE id=p_transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  SELECT * INTO period FROM periods WHERE t.transfer_date BETWEEN date_from AND date_to FOR UPDATE;
  IF NOT FOUND OR period.closed THEN RAISE EXCEPTION 'Cannot cancel a transfer in a closed or missing period'; END IF;
  PERFORM id FROM vendors WHERE id IN(t.from_vendor_id,t.to_vendor_id) ORDER BY code FOR UPDATE;
  SELECT * INTO t FROM transfers WHERE id=p_transfer_id FOR UPDATE;
  IF t.status<>'active' THEN RAISE EXCEPTION 'Transfer is already cancelled'; END IF;
  IF t.source_invoice_id IS NULL THEN RAISE EXCEPTION 'Legacy balance transfer requires separate reconciliation'; END IF;
  PERFORM id FROM invoices WHERE id IN(t.source_invoice_id,t.destination_invoice_id,t.adjustment_invoice_id) ORDER BY id FOR UPDATE;
  PERFORM assert_transfer_voucher_unused(t.destination_invoice_id);
  IF NOT EXISTS(SELECT 1 FROM invoices WHERE id=t.destination_invoice_id AND balance=t.amount AND supplier_id=t.to_vendor_id) THEN
    RAISE EXCEPTION 'Destination voucher has changed; cancellation is not allowed';
  END IF;
  UPDATE transfers SET status='cancelled',updated_by=actor WHERE id=t.id RETURNING * INTO t;
  UPDATE invoices SET status='cancelled',balance=0,cancelled_at=now(),cancelled_by=actor,
    cancel_reason='Transfer cancelled: '||t.doc_number,updated_by=actor
    WHERE id IN(t.destination_invoice_id,t.adjustment_invoice_id);
  UPDATE invoices SET balance=t.amount,updated_by=actor WHERE id=t.source_invoice_id;
  UPDATE journal_entries SET cancelled=true,cancelled_at=now(),cancelled_by=actor WHERE source_type='transfer' AND source_id=t.id;
  INSERT INTO audit_logs(table_name,record_id,action,new_data,performed_by,detail)
    VALUES('transfers',t.id,'cancel',to_jsonb(t),actor,'Cancelled voucher transfer '||t.doc_number);
  PERFORM recalculate_vendor_balance(t.from_vendor_code);
  PERFORM recalculate_vendor_balance(t.to_vendor_code);
  RETURN t;
END $$;
REVOKE ALL ON FUNCTION public.transfer_ap_voucher(uuid,uuid,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_ap_voucher_transfer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_ap_voucher(uuid,uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ap_voucher_transfer(uuid) TO authenticated;

-- Preserve transfer evidence and prevent cancellation/edit of linked documents.
CREATE FUNCTION public.guard_transferred_invoice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM transfers WHERE status='active' AND source_invoice_id=OLD.id) THEN
    RAISE EXCEPTION 'Cancel the voucher transfer before changing its source voucher';
  END IF;
  IF EXISTS(SELECT 1 FROM transfers WHERE destination_invoice_id=OLD.id OR adjustment_invoice_id=OLD.id) THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Transfer vouchers must be retained for audit'; END IF;
    IF (to_jsonb(NEW)-ARRAY['balance','paid_amount','deposit_amount','deposit_vat','updated_at','updated_by'])
       IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['balance','paid_amount','deposit_amount','deposit_vat','updated_at','updated_by']) THEN
      IF NOT (OLD.status='posted' AND NEW.status='cancelled'
        AND EXISTS(SELECT 1 FROM transfers WHERE status='cancelled' AND (destination_invoice_id=OLD.id OR adjustment_invoice_id=OLD.id))
        AND (to_jsonb(NEW)-ARRAY['balance','updated_at','updated_by','status','cancelled_at','cancelled_by','cancel_reason'])
          IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['balance','updated_at','updated_by','status','cancelled_at','cancelled_by','cancel_reason'])) THEN
        RAISE EXCEPTION 'Manage this voucher through its transfer';
      END IF;
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_transferred_invoice BEFORE UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_transferred_invoice();

-- Lock allocation inserts against a concurrent transfer and reject stale vendor selections.
CREATE FUNCTION public.guard_transfer_allocation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i invoices%ROWTYPE; vendor_id uuid;
BEGIN
  SELECT * INTO i FROM invoices WHERE id=NEW.invoice_id FOR UPDATE;
  IF TG_TABLE_NAME='payment_invoices' THEN
    SELECT supplier_id INTO vendor_id FROM payments WHERE id=NEW.payment_id;
  ELSE
    IF NEW.status<>'active' THEN RETURN NEW; END IF;
    SELECT supplier_id INTO vendor_id FROM deposit_payments WHERE id=NEW.deposit_id;
  END IF;
  IF EXISTS(SELECT 1 FROM transfers WHERE status='active' AND (source_invoice_id=i.id OR adjustment_invoice_id=i.id)) THEN
    RAISE EXCEPTION 'Voucher has been transferred; select its destination voucher';
  END IF;
  IF EXISTS(SELECT 1 FROM transfers WHERE destination_invoice_id=i.id) AND
     (i.status NOT IN ('approved','posted') OR i.balance<=0 OR vendor_id IS DISTINCT FROM i.supplier_id) THEN
    RAISE EXCEPTION 'Transfer voucher is unavailable for this vendor';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_transfer_payment BEFORE INSERT OR UPDATE ON public.payment_invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_transfer_allocation();
CREATE TRIGGER guard_transfer_deposit BEFORE INSERT OR UPDATE ON public.deposit_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_transfer_allocation();

CREATE FUNCTION public.guard_transfer_invoice_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM transfers WHERE
    (TG_OP <> 'INSERT' AND (destination_invoice_id=OLD.invoice_id OR adjustment_invoice_id=OLD.invoice_id OR (status='active' AND source_invoice_id=OLD.invoice_id))) OR
    (TG_OP <> 'DELETE' AND (destination_invoice_id=NEW.invoice_id OR adjustment_invoice_id=NEW.invoice_id OR (status='active' AND source_invoice_id=NEW.invoice_id)))) THEN
    RAISE EXCEPTION 'Transfer voucher accounting lines cannot be changed';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_transfer_invoice_items BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.guard_transfer_invoice_items();
