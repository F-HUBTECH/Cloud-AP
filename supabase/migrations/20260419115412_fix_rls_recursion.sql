-- Fix infinite recursion in RLS policies by using SECURITY DEFINER functions
-- instead of self-referencing EXISTS subqueries

-- ============================================================
-- Helper functions (SECURITY DEFINER bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = auth.uid()
       AND r.code IN ('ADMIN','SUPERADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_role(role_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = auth.uid()
       AND r.code = role_code
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- user_roles: allow all authenticated to read (not sensitive)
-- ============================================================
DROP POLICY IF EXISTS "user_roles: authenticated can read own roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles: admin can manage" ON user_roles;
DROP POLICY IF EXISTS "user_roles: authenticated can read" ON user_roles;
DROP POLICY IF EXISTS "user_roles: admin can insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles: admin can delete" ON user_roles;
DROP POLICY IF EXISTS "user_roles: admin can update" ON user_roles;

CREATE POLICY "user_roles: authenticated can read" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles: admin can insert" ON user_roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "user_roles: admin can delete" ON user_roles FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "user_roles: admin can update" ON user_roles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- app_users
-- ============================================================
DROP POLICY IF EXISTS "app_users: read own profile or admin" ON app_users;
DROP POLICY IF EXISTS "app_users: admin can insert" ON app_users;
DROP POLICY IF EXISTS "app_users: update own profile or admin" ON app_users;

CREATE POLICY "app_users: read own profile or admin" ON app_users FOR SELECT TO authenticated USING (auth_uid = auth.uid() OR is_admin());
CREATE POLICY "app_users: admin can insert" ON app_users FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "app_users: update own profile or admin" ON app_users FOR UPDATE TO authenticated USING (auth_uid = auth.uid() OR is_admin()) WITH CHECK (auth_uid = auth.uid() OR is_admin());

-- ============================================================
-- roles
-- ============================================================
DROP POLICY IF EXISTS "roles: authenticated can read" ON roles;
DROP POLICY IF EXISTS "roles: admin can manage" ON roles;

CREATE POLICY "roles: authenticated can read" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles: admin can manage" ON roles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- config
-- ============================================================
DROP POLICY IF EXISTS "config: authenticated can read" ON config;
DROP POLICY IF EXISTS "config: admin can manage" ON config;

CREATE POLICY "config: authenticated can read" ON config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config: admin can manage" ON config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- vendors
-- ============================================================
DROP POLICY IF EXISTS "vendors: all authenticated can read" ON vendors;
DROP POLICY IF EXISTS "vendors: authenticated can read" ON vendors;
DROP POLICY IF EXISTS "vendors: ap_role can write" ON vendors;

CREATE POLICY "vendors: authenticated can read" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors: ap_role can write" ON vendors FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- vendor_monthly_balances
-- ============================================================
DROP POLICY IF EXISTS "vendor_monthly_balances: authenticated can read" ON vendor_monthly_balances;
DROP POLICY IF EXISTS "vendor_monthly_balances: ap_role can write" ON vendor_monthly_balances;

CREATE POLICY "vendor_monthly_balances: authenticated can read" ON vendor_monthly_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendor_monthly_balances: ap_role can write" ON vendor_monthly_balances FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- ap_types
-- ============================================================
DROP POLICY IF EXISTS "ap_types: authenticated can read" ON ap_types;
DROP POLICY IF EXISTS "ap_types: admin can manage" ON ap_types;

CREATE POLICY "ap_types: authenticated can read" ON ap_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "ap_types: admin can manage" ON ap_types FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- vat_codes
-- ============================================================
DROP POLICY IF EXISTS "vat_codes: authenticated can read" ON vat_codes;
DROP POLICY IF EXISTS "vat_codes: admin can manage" ON vat_codes;

CREATE POLICY "vat_codes: authenticated can read" ON vat_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "vat_codes: admin can manage" ON vat_codes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- wht_codes
-- ============================================================
DROP POLICY IF EXISTS "wht_codes: authenticated can read" ON wht_codes;
DROP POLICY IF EXISTS "wht_codes: admin can manage" ON wht_codes;

CREATE POLICY "wht_codes: authenticated can read" ON wht_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "wht_codes: admin can manage" ON wht_codes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- payment_codes
-- ============================================================
DROP POLICY IF EXISTS "payment_codes: authenticated can read" ON payment_codes;
DROP POLICY IF EXISTS "payment_codes: admin can manage" ON payment_codes;

CREATE POLICY "payment_codes: authenticated can read" ON payment_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_codes: admin can manage" ON payment_codes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- periods
-- ============================================================
DROP POLICY IF EXISTS "periods: authenticated can read" ON periods;
DROP POLICY IF EXISTS "periods: admin can manage" ON periods;

CREATE POLICY "periods: authenticated can read" ON periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "periods: admin can manage" ON periods FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- invoices
-- ============================================================
DROP POLICY IF EXISTS "invoices: authenticated can read" ON invoices;
DROP POLICY IF EXISTS "invoices: ap_role can insert" ON invoices;
DROP POLICY IF EXISTS "invoices: ap_role can update" ON invoices;
DROP POLICY IF EXISTS "invoices: admin can delete" ON invoices;

CREATE POLICY "invoices: authenticated can read" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices: ap_role can insert" ON invoices FOR INSERT TO authenticated WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());
CREATE POLICY "invoices: ap_role can update" ON invoices FOR UPDATE TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());
CREATE POLICY "invoices: admin can delete" ON invoices FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- invoice_items
-- ============================================================
DROP POLICY IF EXISTS "invoice_items: authenticated can read" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items: ap_role can write" ON invoice_items;

CREATE POLICY "invoice_items: authenticated can read" ON invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoice_items: ap_role can write" ON invoice_items FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "payments: authenticated can read" ON payments;
DROP POLICY IF EXISTS "payments: ap_role can insert" ON payments;
DROP POLICY IF EXISTS "payments: ap_role can update" ON payments;
DROP POLICY IF EXISTS "payments: admin can delete" ON payments;

CREATE POLICY "payments: authenticated can read" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments: ap_role can insert" ON payments FOR INSERT TO authenticated WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());
CREATE POLICY "payments: ap_role can update" ON payments FOR UPDATE TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());
CREATE POLICY "payments: admin can delete" ON payments FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- payment_items
-- ============================================================
DROP POLICY IF EXISTS "payment_items: authenticated can read" ON payment_items;
DROP POLICY IF EXISTS "payment_items: ap_role can write" ON payment_items;

CREATE POLICY "payment_items: authenticated can read" ON payment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_items: ap_role can write" ON payment_items FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- payment_invoices
-- ============================================================
DROP POLICY IF EXISTS "payment_invoices: authenticated can read" ON payment_invoices;
DROP POLICY IF EXISTS "payment_invoices: ap_role can write" ON payment_invoices;

CREATE POLICY "payment_invoices: authenticated can read" ON payment_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_invoices: ap_role can write" ON payment_invoices FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- approvals
-- ============================================================
DROP POLICY IF EXISTS "approvals: authenticated can read related" ON approvals;
DROP POLICY IF EXISTS "approvals: ap_role can insert" ON approvals;
DROP POLICY IF EXISTS "approvals: approver can update" ON approvals;

CREATE POLICY "approvals: authenticated can read" ON approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "approvals: ap_role can insert" ON approvals FOR INSERT TO authenticated WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());
CREATE POLICY "approvals: approver can update" ON approvals FOR UPDATE TO authenticated USING (has_role('APPROVER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- approval_policies
-- ============================================================
DROP POLICY IF EXISTS "approval_policies: authenticated can read" ON approval_policies;
DROP POLICY IF EXISTS "approval_policies: admin can manage" ON approval_policies;

CREATE POLICY "approval_policies: authenticated can read" ON approval_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_policies: admin can manage" ON approval_policies FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- month_end
-- ============================================================
DROP POLICY IF EXISTS "month_end: authenticated can read" ON month_end;
DROP POLICY IF EXISTS "month_end: ap_role can write" ON month_end;

CREATE POLICY "month_end: authenticated can read" ON month_end FOR SELECT TO authenticated USING (true);
CREATE POLICY "month_end: ap_role can write" ON month_end FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- bank_reconciliations
-- ============================================================
DROP POLICY IF EXISTS "bank_reconciliations: authenticated can read" ON bank_reconciliations;
DROP POLICY IF EXISTS "bank_reconciliations: ap_role can write" ON bank_reconciliations;

CREATE POLICY "bank_reconciliations: authenticated can read" ON bank_reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_reconciliations: ap_role can write" ON bank_reconciliations FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- deposit_payments
-- ============================================================
DROP POLICY IF EXISTS "deposit_payments: authenticated can read" ON deposit_payments;
DROP POLICY IF EXISTS "deposit_payments: ap_role can write" ON deposit_payments;

CREATE POLICY "deposit_payments: authenticated can read" ON deposit_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "deposit_payments: ap_role can write" ON deposit_payments FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- deposit_payment_items
-- ============================================================
DROP POLICY IF EXISTS "deposit_payment_items: authenticated can read" ON deposit_payment_items;
DROP POLICY IF EXISTS "deposit_payment_items: ap_role can write" ON deposit_payment_items;

CREATE POLICY "deposit_payment_items: authenticated can read" ON deposit_payment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "deposit_payment_items: ap_role can write" ON deposit_payment_items FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- cheque_transactions
-- ============================================================
DROP POLICY IF EXISTS "cheque_transactions: authenticated can read" ON cheque_transactions;
DROP POLICY IF EXISTS "cheque_transactions: ap_role can write" ON cheque_transactions;

CREATE POLICY "cheque_transactions: authenticated can read" ON cheque_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cheque_transactions: ap_role can write" ON cheque_transactions FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- withholding_taxes
-- ============================================================
DROP POLICY IF EXISTS "withholding_taxes: authenticated can read" ON withholding_taxes;
DROP POLICY IF EXISTS "withholding_taxes: ap_role can write" ON withholding_taxes;

CREATE POLICY "withholding_taxes: authenticated can read" ON withholding_taxes FOR SELECT TO authenticated USING (true);
CREATE POLICY "withholding_taxes: ap_role can write" ON withholding_taxes FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- wht_per_supplier
-- ============================================================
DROP POLICY IF EXISTS "wht_per_supplier: authenticated can read" ON wht_per_supplier;
DROP POLICY IF EXISTS "wht_per_supplier: ap_role can write" ON wht_per_supplier;

CREATE POLICY "wht_per_supplier: authenticated can read" ON wht_per_supplier FOR SELECT TO authenticated USING (true);
CREATE POLICY "wht_per_supplier: ap_role can write" ON wht_per_supplier FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- invoice_attachments
-- ============================================================
DROP POLICY IF EXISTS "invoice_attachments: authenticated can read" ON invoice_attachments;
DROP POLICY IF EXISTS "invoice_attachments: ap_role can insert" ON invoice_attachments;
DROP POLICY IF EXISTS "invoice_attachments: ap_role can delete" ON invoice_attachments;

CREATE POLICY "invoice_attachments: authenticated can read" ON invoice_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoice_attachments: ap_role can insert" ON invoice_attachments FOR INSERT TO authenticated WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());
CREATE POLICY "invoice_attachments: ap_role can delete" ON invoice_attachments FOR DELETE TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());

-- ============================================================
-- doc_number_sequences
-- ============================================================
DROP POLICY IF EXISTS "doc_number_sequences: service_role only" ON doc_number_sequences;

CREATE POLICY "doc_number_sequences: admin can manage" ON doc_number_sequences FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- audit_logs
-- ============================================================
DROP POLICY IF EXISTS "audit_logs: authenticated can read own or admin" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs: system can insert" ON audit_logs;

CREATE POLICY "audit_logs: read own or admin" ON audit_logs FOR SELECT TO authenticated USING (performed_by = auth.uid() OR is_admin());
CREATE POLICY "audit_logs: system can insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- report_groups
-- ============================================================
DROP POLICY IF EXISTS "report_groups: authenticated can read" ON report_groups;
DROP POLICY IF EXISTS "report_groups: admin can manage" ON report_groups;

CREATE POLICY "report_groups: authenticated can read" ON report_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "report_groups: admin can manage" ON report_groups FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- reports
-- ============================================================
DROP POLICY IF EXISTS "reports: authenticated can read authorized" ON reports;
DROP POLICY IF EXISTS "reports: admin can manage" ON reports;

CREATE POLICY "reports: authenticated can read" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "reports: admin can manage" ON reports FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- report_permissions
-- ============================================================
DROP POLICY IF EXISTS "report_permissions: read own or admin" ON report_permissions;
DROP POLICY IF EXISTS "report_permissions: admin can manage" ON report_permissions;

CREATE POLICY "report_permissions: read own or admin" ON report_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "report_permissions: admin can manage" ON report_permissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- i18n_messages
-- ============================================================
DROP POLICY IF EXISTS "i18n_messages: authenticated can read" ON i18n_messages;
DROP POLICY IF EXISTS "i18n_messages: admin can manage" ON i18n_messages;

CREATE POLICY "i18n_messages: authenticated can read" ON i18n_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "i18n_messages: admin can manage" ON i18n_messages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- bank_accounts
-- ============================================================
DROP POLICY IF EXISTS "bank_accounts: authenticated can read" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts: admin can manage" ON bank_accounts;

CREATE POLICY "bank_accounts: authenticated can read" ON bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts: admin can manage" ON bank_accounts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- gl_accounts
-- ============================================================
DROP POLICY IF EXISTS "gl_accounts: authenticated can read" ON gl_accounts;
DROP POLICY IF EXISTS "gl_accounts: admin can manage" ON gl_accounts;

CREATE POLICY "gl_accounts: authenticated can read" ON gl_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "gl_accounts: admin can manage" ON gl_accounts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- transfers
-- ============================================================
DROP POLICY IF EXISTS "transfers: authenticated can read" ON transfers;
DROP POLICY IF EXISTS "transfers: ap_role can write" ON transfers;

CREATE POLICY "transfers: authenticated can read" ON transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfers: ap_role can write" ON transfers FOR ALL TO authenticated USING (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin()) WITH CHECK (has_role('AP_USER') OR has_role('AP_MANAGER') OR is_admin());