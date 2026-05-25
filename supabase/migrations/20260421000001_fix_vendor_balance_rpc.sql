-- Fix recalculate_vendor_balance to consider ALL transaction types
CREATE OR REPLACE FUNCTION recalculate_vendor_balance(
  p_vendor_code TEXT
) RETURNS VOID AS $$
DECLARE
  v_vendor_id UUID;
  v_inv_amount NUMERIC := 0;
  v_dr_amount NUMERIC := 0;
  v_pay_amount NUMERIC := 0;
  v_dep_amount NUMERIC := 0;
  v_dep_applied NUMERIC := 0;
  v_trf_in NUMERIC := 0;
  v_trf_out NUMERIC := 0;
BEGIN
  SELECT id INTO v_vendor_id FROM vendors WHERE code = p_vendor_code LIMIT 1;
  IF v_vendor_id IS NULL THEN RETURN; END IF;

  -- Invoices (AP, ADJ) = charges
  SELECT COALESCE(SUM(total_amount), 0)
    INTO v_inv_amount
    FROM invoices
   WHERE supplier_id = v_vendor_id
     AND status NOT IN ('cancelled', 'voided')
     AND ap_type_code IN ('AP', 'ADJ');

  -- Debit Notes = reduces charges
  SELECT COALESCE(SUM(total_amount), 0)
    INTO v_dr_amount
    FROM invoices
   WHERE supplier_id = v_vendor_id
     AND status NOT IN ('cancelled', 'voided')
     AND ap_type_code = 'DR';

  -- Payments
  SELECT COALESCE(SUM(total_net), 0)
    INTO v_pay_amount
    FROM payments
   WHERE supplier_id = v_vendor_id
     AND status = 'paid';

  -- Deposits (total created)
  SELECT COALESCE(SUM(amount), 0)
    INTO v_dep_amount
    FROM deposit_payments
   WHERE supplier_id = v_vendor_id
     AND status IN ('active', 'applied');

  -- Deposit applications applied to invoices (reduces amount owed)
  SELECT COALESCE(SUM(da.amount_applied), 0)
    INTO v_dep_applied
    FROM deposit_applications da
    JOIN deposit_payments dp ON dp.id = da.deposit_id
   WHERE dp.supplier_id = v_vendor_id
     AND da.status = 'active';

  -- Transfers IN
  SELECT COALESCE(SUM(amount), 0)
    INTO v_trf_in
    FROM transfers
   WHERE to_vendor_id = v_vendor_id
     AND status = 'active';

  -- Transfers OUT
  SELECT COALESCE(SUM(amount), 0)
    INTO v_trf_out
    FROM transfers
   WHERE from_vendor_id = v_vendor_id
     AND status = 'active';

  UPDATE vendors
     SET total_amount  = v_inv_amount,
         total_payment = v_pay_amount,
         open_amount   = v_inv_amount
                        - v_dr_amount
                        - v_pay_amount
                        - v_dep_applied
                        + v_trf_in
                        - v_trf_out,
         deposit_balance = v_dep_amount - v_dep_applied
   WHERE id = v_vendor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add cancelInvoice RPC for atomic cancel operation
CREATE OR REPLACE FUNCTION cancel_invoice(
  p_invoice_id UUID,
  p_cancel_reason TEXT,
  p_cancelled_by UUID
) RETURNS VOID AS $$
DECLARE
  v_supplier_code TEXT;
BEGIN
  SELECT supplier_code INTO v_supplier_code
    FROM invoices WHERE id = p_invoice_id;

  IF v_supplier_code IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  UPDATE invoices
     SET status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = p_cancelled_by,
         cancel_reason = p_cancel_reason,
         updated_at = now()
   WHERE id = p_invoice_id;

  PERFORM recalculate_vendor_balance(v_supplier_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
