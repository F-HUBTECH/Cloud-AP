-- GL Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number      varchar(30) NOT NULL,
  source_type     varchar(20) NOT NULL,
  source_id       uuid NOT NULL,
  doc_date        date NOT NULL,
  period_year     varchar(4) NOT NULL,
  period_month    varchar(2) NOT NULL,
  description     text,
  total_debit     numeric(20,5) NOT NULL DEFAULT 0,
  total_credit    numeric(20,5) NOT NULL DEFAULT 0,
  is_posted       boolean NOT NULL DEFAULT false,
  posted_at       timestamptz,
  posted_by       uuid REFERENCES app_users(id),
  cancelled       boolean NOT NULL DEFAULT false,
  cancelled_at    timestamptz,
  cancelled_by    uuid REFERENCES app_users(id),
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_no         integer NOT NULL DEFAULT 1,
  gl_account      varchar(20) NOT NULL,
  description     text,
  debit           numeric(20,5) NOT NULL DEFAULT 0,
  credit          numeric(20,5) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      varchar(100) NOT NULL,
  record_id       uuid,
  action          varchar(20) NOT NULL,
  old_data        jsonb,
  new_data        jsonb,
  performed_by    uuid REFERENCES app_users(id),
  performed_at    timestamptz NOT NULL DEFAULT now(),
  ip_address      inet,
  detail          text
);

-- RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries: read" ON journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "journal_entries: write" ON journal_entries FOR ALL TO authenticated
  USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin())
  WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

CREATE POLICY "journal_entry_lines: read" ON journal_entry_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "journal_entry_lines: write" ON journal_entry_lines FOR ALL TO authenticated
  USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin())
  WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

CREATE POLICY "audit_logs: read" ON audit_logs FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "audit_logs: write" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs (performed_at DESC);

-- Triggers
CREATE TRIGGER set_updated_at_journal_entries BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit log helper function
CREATE OR REPLACE FUNCTION log_audit(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_detail TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by, detail)
  VALUES (p_table_name, p_record_id, p_action, p_old_data, p_new_data, p_performed_by, p_detail);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Period validation: check for pending transactions before closing
CREATE OR REPLACE FUNCTION validate_period_can_close(
  p_year TEXT,
  p_month TEXT
) RETURNS TEXT AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
    FROM invoices
   WHERE period_year = p_year
     AND period_month = p_month
     AND status IN ('draft', 'pending_approval');

  IF v_pending_count > 0 THEN
    RETURN 'Found ' || v_pending_count || ' pending invoice(s) in period ' || p_year || '/' || p_month;
  END IF;

  SELECT COUNT(*) INTO v_pending_count
    FROM payments
   WHERE period_year = p_year
     AND period_month = p_month
     AND status IN ('draft', 'pending_approval', 'approved');

  IF v_pending_count > 0 THEN
    RETURN 'Found ' || v_pending_count || ' uncompleted payment(s) in period ' || p_year || '/' || p_month;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
