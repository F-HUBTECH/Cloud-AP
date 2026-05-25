-- Create transfers table (not in initial migration)
CREATE TABLE IF NOT EXISTS transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number      varchar(30) UNIQUE,
  transfer_date   date NOT NULL,
  from_vendor_code varchar(20) REFERENCES vendors(code),
  to_vendor_code   varchar(20) REFERENCES vendors(code),
  from_vendor_id  uuid REFERENCES vendors(id),
  to_vendor_id    uuid REFERENCES vendors(id),
  amount          numeric(20,5) DEFAULT 0,
  remark          text,
  status          varchar(10) DEFAULT 'active',
  period_year     varchar(4),
  period_month    varchar(2),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Create bank_accounts table if not exists
CREATE TABLE IF NOT EXISTS bank_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(10) NOT NULL UNIQUE,
  name        varchar(60) NOT NULL,
  account_no  varchar(30),
  branch      varchar(60),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Create gl_accounts table if not exists
CREATE TABLE IF NOT EXISTS gl_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(20) NOT NULL UNIQUE,
  name        varchar(100) NOT NULL,
  level_no    integer DEFAULT 1,
  parent_code varchar(20),
  account_type varchar(10) DEFAULT 'detail',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfers: authenticated can read"
  ON transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "transfers: ap_role can write"
  ON transfers FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER'))
  );

-- Add trigger for transfers
CREATE TRIGGER set_updated_at_transfers BEFORE UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add seed data for bank accounts and GL accounts if not already present
INSERT INTO bank_accounts (code, name, account_no) VALUES
  ('BBL', 'Bangkok Bank', '123-4-56789-0'),
  ('KTB', 'Krung Thai Bank', '987-6-54321-0'),
  ('SCB', 'Siam Commercial Bank', '456-7-89012-0')
ON CONFLICT (code) DO NOTHING;

INSERT INTO gl_accounts (code, name, level_no, account_type) VALUES
  ('1100', 'Cash', 1, 'detail'),
  ('1200', 'Accounts Receivable', 1, 'detail'),
  ('2000', 'Accounts Payable', 1, 'detail'),
  ('2100', 'VAT Payable', 1, 'detail'),
  ('2200', 'WHT Payable', 1, 'detail'),
  ('4000', 'Revenue', 1, 'detail'),
  ('5000', 'Expenses', 1, 'detail')
ON CONFLICT (code) DO NOTHING;

-- Add helper functions (RPC)
CREATE OR REPLACE FUNCTION next_doc_number(
  p_table TEXT,
  p_field TEXT,
  p_prefix TEXT,
  p_digits INTEGER DEFAULT 5
) RETURNS TEXT AS $$
DECLARE
  v_next_num INTEGER;
  v_doc_no TEXT;
BEGIN
  INSERT INTO doc_number_sequences (table_name, field_name, group_key, last_value)
  VALUES (p_table, p_field, p_prefix, 1)
  ON CONFLICT (table_name, field_name, group_key)
  DO UPDATE SET last_value = doc_number_sequences.last_value + 1
  RETURNING last_value INTO v_next_num;

  v_doc_no := p_prefix || lpad(v_next_num::TEXT, p_digits, '0');
  RETURN v_doc_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recalculate_vendor_balance(
  p_vendor_id UUID
) RETURNS VOID AS $$
DECLARE
  v_total_amount NUMERIC;
  v_total_payment NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0)
    INTO v_total_amount, v_total_payment
    FROM invoices
   WHERE supplier_id = p_vendor_id
     AND status NOT IN ('cancelled', 'voided');

  UPDATE vendors
     SET total_amount = v_total_amount,
         total_payment = v_total_payment,
         open_amount = v_total_amount - v_total_payment
   WHERE id = p_vendor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_cheque_cleared(
  p_cheque_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE cheque_transactions
     SET remark = COALESCE(remark, '') || ' [CLEARED]'
   WHERE id = p_cheque_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;