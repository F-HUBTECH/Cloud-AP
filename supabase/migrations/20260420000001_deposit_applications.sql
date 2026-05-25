-- Deposit Applications table: links deposits to invoices
CREATE TABLE IF NOT EXISTS deposit_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id      uuid NOT NULL REFERENCES deposit_payments(id) ON DELETE CASCADE,
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount_applied  numeric(20,5) NOT NULL DEFAULT 0,
  vat_applied     numeric(20,5) DEFAULT 0,
  applied_by      uuid REFERENCES app_users(id),
  applied_at      timestamptz NOT NULL DEFAULT now(),
  status          varchar(10) DEFAULT 'active',
  cancelled_at    timestamptz,
  cancelled_by    uuid REFERENCES app_users(id),
  cancel_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deposit_id, invoice_id)
);

-- Add applied_amount and remaining_amount columns to deposit_payments
ALTER TABLE deposit_payments ADD COLUMN IF NOT EXISTS applied_amount numeric(20,5) DEFAULT 0;
ALTER TABLE deposit_payments ADD COLUMN IF NOT EXISTS remaining_amount numeric(20,5) DEFAULT 0;

-- RLS
ALTER TABLE deposit_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deposit_applications: authenticated can read"
  ON deposit_applications FOR SELECT TO authenticated USING (true);

CREATE POLICY "deposit_applications: ap_role can write"
  ON deposit_applications FOR ALL TO authenticated
  USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin())
  WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposit_applications_deposit ON deposit_applications (deposit_id);
CREATE INDEX IF NOT EXISTS idx_deposit_applications_invoice ON deposit_applications (invoice_id);

-- Trigger
CREATE TRIGGER set_updated_at_deposit_applications BEFORE UPDATE ON deposit_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();