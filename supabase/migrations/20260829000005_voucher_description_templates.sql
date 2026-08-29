-- Reversible additive migration: stores reusable AP Voucher descriptions.
CREATE TABLE IF NOT EXISTS voucher_description_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE voucher_description_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voucher templates: authenticated can read" ON voucher_description_templates;
CREATE POLICY "voucher templates: authenticated can read"
  ON voucher_description_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "voucher templates: admin can manage" ON voucher_description_templates;
CREATE POLICY "voucher templates: admin can manage"
  ON voucher_description_templates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS voucher_description_templates_description_idx
  ON voucher_description_templates (description);
