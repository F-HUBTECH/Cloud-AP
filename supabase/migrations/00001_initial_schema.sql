-- ============================================================
-- KSAP Accounts Payable — Initial Schema
-- PostgreSQL / Supabase
-- ============================================================

-- -----------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------
-- 1. ENUM types
-- -----------------------------------------------------------
CREATE TYPE app_currency AS ENUM ('THB','USD','EUR','GBP','JPY','CNY','SGD','MYR');

CREATE TYPE invoice_status AS ENUM (
  'draft','pending_approval','approved','rejected','posted','cancelled','voided'
);

CREATE TYPE payment_status AS ENUM (
  'draft','pending_approval','approved','rejected','paid','cancelled','voided'
);

CREATE TYPE approval_status AS ENUM (
  'pending','approved','rejected','returned'
);

CREATE TYPE payment_method AS ENUM (
  'cash','cheque','bank_transfer','credit_card','offset','deposit'
);

CREATE TYPE approval_action AS ENUM (
  'submit','approve','reject','return','cancel'
);

CREATE TYPE entity_type AS ENUM (
  'invoice','payment','deposit','bank_reconciliation'
);

CREATE TYPE wht_card_type AS ENUM (
  'person','company','government','non_profit','foreign'
);

CREATE TYPE vat_type AS ENUM (
  'inclusive','exclusive','exempt','none'
);

CREATE TYPE audit_action AS ENUM (
  'create','update','delete','approve','reject','post','cancel','void','print','export'
);

-- -----------------------------------------------------------
-- 2. Roles (before app_users so we can FK)
-- -----------------------------------------------------------
CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(20) NOT NULL UNIQUE,
  name        varchar(100) NOT NULL,
  name_th     varchar(100),
  description text,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 3. App Users
-- -----------------------------------------------------------
CREATE TABLE app_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid      uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  login_name    varchar(50) NOT NULL UNIQUE,
  display_name  varchar(150) NOT NULL,
  email         varchar(255),
  phone         varchar(30),
  department    varchar(100),
  position      varchar(100),
  employee_id   varchar(30),
  language      varchar(5) NOT NULL DEFAULT 'en',
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 4. User Roles (junction)
-- -----------------------------------------------------------
CREATE TABLE user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES app_users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

-- -----------------------------------------------------------
-- 5. Role Rights
-- -----------------------------------------------------------
CREATE TABLE role_rights (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id   uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource  varchar(80) NOT NULL,
  action    varchar(40) NOT NULL,
  permitted boolean NOT NULL DEFAULT true,
  UNIQUE (role_id, resource, action)
);

-- -----------------------------------------------------------
-- 6. System Config
-- -----------------------------------------------------------
CREATE TABLE config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code    varchar(15) NOT NULL UNIQUE,
  company_name_en varchar(100),
  company_name_th varchar(100),
  address_line1   varchar(100),
  address_line2   varchar(100),
  address_line3   varchar(100),
  city            varchar(60),
  country         varchar(60),
  zip_code         varchar(10),
  tax_id          varchar(30),
  phone           varchar(30),
  fax             varchar(30),
  email           varchar(100),
  reg_no          varchar(100),
  contact_person  varchar(100),
  vat_percent     numeric(5,2) NOT NULL DEFAULT 0,
  wht_percent     numeric(5,2) NOT NULL DEFAULT 0,
  disp_format     varchar(30) DEFAULT '#,##0.00',
  edit_format     varchar(30) DEFAULT '###0.00',
  default_lang    varchar(5) DEFAULT 'en',
  period_month    varchar(2),
  period_year     varchar(4),
  currency        app_currency NOT NULL DEFAULT 'THB',
  auto_doc_no     boolean NOT NULL DEFAULT true,
  connect_gl      varchar(50),
  -- Document number format columns
  vc_auto         integer DEFAULT 1,
  vc_format1      varchar(10),
  vc_format2      varchar(10),
  vc_fix_for      integer,
  vc_for_len      integer,
  dr_auto         integer DEFAULT 1,
  dr_format1      varchar(10),
  dr_format2      varchar(10),
  dr_fix_for      integer,
  dr_for_len      integer,
  pd_auto         integer DEFAULT 1,
  pd_format1      varchar(10),
  pd_format2      varchar(10),
  pd_fix_for      integer,
  pd_for_len      integer,
  dp_auto         integer DEFAULT 1,
  dp_format1      varchar(10),
  dp_format2      varchar(10),
  dp_fix_for      integer,
  dp_for_len      integer,
  -- Validation flags
  chk_vc_dup      boolean DEFAULT true,
  chk_vc_empty    boolean DEFAULT true,
  chk_inv_dup     boolean DEFAULT true,
  chk_inv_empty   boolean DEFAULT true,
  chk_ac_date     boolean DEFAULT false,
  chk_upd_over    boolean DEFAULT false,
  chk_ac_trade    boolean DEFAULT true,
  chk_ac_tax      boolean DEFAULT true,
  chk_send_gl     boolean DEFAULT true,
  chk_gl_mn       boolean DEFAULT true,
  -- WHT / print flags
  gen_wht         boolean DEFAULT true,
  prn_wht         boolean DEFAULT true,
  print_payment   boolean DEFAULT true,
  chk_cheque_no   boolean DEFAULT true,
  import_inv       boolean DEFAULT true,
  print_voucher   boolean DEFAULT true,
  tax_assign_inv  boolean DEFAULT true,
  -- GL account defaults
  acc_trade       varchar(20),
  acc_deposit    varchar(20),
  acc_po         varchar(20),
  acc_add        varchar(20),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 7. Vendors (Suppliers)
-- -----------------------------------------------------------
CREATE TABLE vendors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            varchar(20) NOT NULL UNIQUE,
  name_en         varchar(150) NOT NULL,
  name_th         varchar(150),
  address_line1   varchar(100),
  address_line2   varchar(100),
  address_line3   varchar(100),
  address_line1_th varchar(100),
  address_line2_th varchar(100),
  address_line3_th varchar(100),
  city            varchar(60),
  country         varchar(60),
  city_th         varchar(60),
  country_th      varchar(60),
  zip_code        varchar(10),
  tel             varchar(40),
  fax             varchar(30),
  email           varchar(100),
  attn            varchar(50),
  remark          text,
  vendor_type     varchar(5) NOT NULL DEFAULT 'N',
  ap_type_code    varchar(5),
  tax_id          varchar(30),
  card_id         varchar(30),
  tax_percent     numeric(5,2) DEFAULT 0,
  wht_percent     numeric(5,2) DEFAULT 0,
  credit_term     integer DEFAULT 0,
  keep_po         boolean DEFAULT false,
  transfer_ap     boolean DEFAULT true,
  ac_trade        varchar(20),
  ac_deposit     varchar(20),
  ac_po          varchar(20),
  ac_add         varchar(20),
  wht_card_type  wht_card_type DEFAULT 'company',
  wht_code       varchar(5),
  vat_code       varchar(5),
  -- Monthly balance columns (1-15)
  open_amount     numeric(20,5) DEFAULT 0,
  open_payment    numeric(20,5) DEFAULT 0,
  amt_01 numeric(20,5) DEFAULT 0, amt_02 numeric(20,5) DEFAULT 0,
  amt_03 numeric(20,5) DEFAULT 0, amt_04 numeric(20,5) DEFAULT 0,
  amt_05 numeric(20,5) DEFAULT 0, amt_06 numeric(20,5) DEFAULT 0,
  amt_07 numeric(20,5) DEFAULT 0, amt_08 numeric(20,5) DEFAULT 0,
  amt_09 numeric(20,5) DEFAULT 0, amt_10 numeric(20,5) DEFAULT 0,
  amt_11 numeric(20,5) DEFAULT 0, amt_12 numeric(20,5) DEFAULT 0,
  amt_13 numeric(20,5) DEFAULT 0, amt_14 numeric(20,5) DEFAULT 0,
  amt_15 numeric(20,5) DEFAULT 0,
  pay_01 numeric(20,5) DEFAULT 0, pay_02 numeric(20,5) DEFAULT 0,
  pay_03 numeric(20,5) DEFAULT 0, pay_04 numeric(20,5) DEFAULT 0,
  pay_05 numeric(20,5) DEFAULT 0, pay_06 numeric(20,5) DEFAULT 0,
  pay_07 numeric(20,5) DEFAULT 0, pay_08 numeric(20,5) DEFAULT 0,
  pay_09 numeric(20,5) DEFAULT 0, pay_10 numeric(20,5) DEFAULT 0,
  pay_11 numeric(20,5) DEFAULT 0, pay_12 numeric(20,5) DEFAULT 0,
  pay_13 numeric(20,5) DEFAULT 0, pay_14 numeric(20,5) DEFAULT 0,
  pay_15 numeric(20,5) DEFAULT 0,
  total_amount    numeric(20,5) DEFAULT 0,
  total_payment   numeric(20,5) DEFAULT 0,
  deposit_balance numeric(20,5) DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 8. Vendor Monthly Balances
-- -----------------------------------------------------------
CREATE TABLE vendor_monthly_balances (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  period_year  varchar(4) NOT NULL,
  period_month varchar(2) NOT NULL,
  open_amount  numeric(20,5) DEFAULT 0,
  open_dr      numeric(20,5) DEFAULT 0,
  open_apply   numeric(20,5) DEFAULT 0,
  open_paid    numeric(20,5) DEFAULT 0,
  open_balance numeric(20,5) DEFAULT 0,
  inv_amount   numeric(20,5) DEFAULT 0,
  dr_amount    numeric(20,5) DEFAULT 0,
  apply_amount numeric(20,5) DEFAULT 0,
  paid_amount  numeric(20,5) DEFAULT 0,
  balance      numeric(20,5) DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, period_year, period_month)
);

-- -----------------------------------------------------------
-- 9. AP Types
-- -----------------------------------------------------------
CREATE TABLE ap_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(5) NOT NULL UNIQUE,
  name varchar(60) NOT NULL
);

-- -----------------------------------------------------------
-- 10. VAT Codes
-- -----------------------------------------------------------
CREATE TABLE vat_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(5) NOT NULL UNIQUE,
  rate        numeric(5,2) NOT NULL DEFAULT 0,
  description varchar(60),
  gl_account  varchar(20)
);

-- -----------------------------------------------------------
-- 11. WHT Codes
-- -----------------------------------------------------------
CREATE TABLE wht_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(5) NOT NULL UNIQUE,
  rate        numeric(5,2) NOT NULL DEFAULT 0,
  description varchar(100),
  gl_account  varchar(20),
  assign_zero boolean DEFAULT false
);

-- -----------------------------------------------------------
-- 12. Payment Codes
-- -----------------------------------------------------------
CREATE TABLE payment_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(5) NOT NULL UNIQUE,
  description varchar(60),
  gl_account  varchar(20)
);

-- -----------------------------------------------------------
-- 13. Periods
-- -----------------------------------------------------------
CREATE TABLE periods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year varchar(4) NOT NULL,
  period_month varchar(2) NOT NULL,
  date_from   date NOT NULL,
  date_to     date NOT NULL,
  closed      boolean NOT NULL DEFAULT false,
  closed_at   timestamptz,
  closed_by   uuid REFERENCES app_users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month)
);

-- -----------------------------------------------------------
-- 14. Invoices (AP Transactions header)
-- -----------------------------------------------------------
CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number       varchar(30) NOT NULL UNIQUE,
  doc_date         date NOT NULL,
  supplier_code    varchar(20) NOT NULL REFERENCES vendors(code),
  supplier_id      uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  inv_number       varchar(30),
  inv_date         date,
  due_days         integer DEFAULT 0,
  due_date         date,
  remark           text,
  ap_type_code     varchar(5),
  currency         app_currency DEFAULT 'THB',
  vat_type         vat_type DEFAULT 'none',
  vat_code         varchar(5),
  vat_number       varchar(20),
  wht_code         varchar(5),
  po_number        varchar(20),
  receive_voucher  varchar(30),
  total_no_vat     numeric(20,5) DEFAULT 0,
  total_vat        numeric(20,5) DEFAULT 0,
  total_wht        numeric(20,5) DEFAULT 0,
  total_amount     numeric(20,5) DEFAULT 0,
  dr_amount        numeric(20,5) DEFAULT 0,
  cr_amount        numeric(20,5) DEFAULT 0,
  deposit_amount   numeric(20,5) DEFAULT 0,
  deposit_vat      numeric(20,5) DEFAULT 0,
  paid_amount      numeric(20,5) DEFAULT 0,
  balance          numeric(20,5) DEFAULT 0,
  status           invoice_status NOT NULL DEFAULT 'draft',
  period_year      varchar(4),
  period_month     varchar(2),
  gl_jv_number     varchar(30),
  posted_at        timestamptz,
  posted_by        uuid REFERENCES app_users(id),
  cancelled_at     timestamptz,
  cancelled_by     uuid REFERENCES app_users(id),
  cancel_reason    text,
  created_by       uuid REFERENCES app_users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES app_users(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 15. Invoice Items (detail lines)
-- -----------------------------------------------------------
CREATE TABLE invoice_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_no       integer NOT NULL,
  gl_account    varchar(20),
  description   varchar(200),
  dr_amount     numeric(20,5) DEFAULT 0,
  cr_amount     numeric(20,5) DEFAULT 0,
  group_code    varchar(10),
  store_code    varchar(10),
  group_store   varchar(15),
  total_no_vat  numeric(20,5) DEFAULT 0,
  inv_type      varchar(50),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, line_no)
);

-- -----------------------------------------------------------
-- 16. Payments (AP Payment header)
-- -----------------------------------------------------------
CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number      varchar(30) NOT NULL UNIQUE,
  doc_date        date NOT NULL,
  supplier_code   varchar(20) NOT NULL REFERENCES vendors(code),
  supplier_id     uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  pay_method      payment_method NOT NULL DEFAULT 'cheque',
  pay_code        varchar(5),
  bank_code       varchar(10),
  bank_name       varchar(60),
  cheque_number   varchar(30),
  cheque_date     date,
  remark          text,
  currency        app_currency DEFAULT 'THB',
  total_amount    numeric(20,5) DEFAULT 0,
  total_wht       numeric(20,5) DEFAULT 0,
  total_vat       numeric(20,5) DEFAULT 0,
  total_net       numeric(20,5) DEFAULT 0,
  deposit_amount  numeric(20,5) DEFAULT 0,
  deposit_vat     numeric(20,5) DEFAULT 0,
  status          payment_status NOT NULL DEFAULT 'draft',
  period_year     varchar(4),
  period_month    varchar(2),
  gl_jv_number    varchar(30),
  paid_at         timestamptz,
  paid_by         uuid REFERENCES app_users(id),
  cancelled_at    timestamptz,
  cancelled_by    uuid REFERENCES app_users(id),
  cancel_reason   text,
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES app_users(id),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 17. Payment Items (detail lines)
-- -----------------------------------------------------------
CREATE TABLE payment_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  line_no       integer NOT NULL,
  gl_account    varchar(20),
  description   varchar(200),
  dr_amount     numeric(20,5) DEFAULT 0,
  cr_amount     numeric(20,5) DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, line_no)
);

-- -----------------------------------------------------------
-- 18. Payment Invoices (payment ↔ invoice allocation)
-- -----------------------------------------------------------
CREATE TABLE payment_invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id    uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  voucher_number varchar(30),
  amount_paid   numeric(20,5) NOT NULL DEFAULT 0,
  wht_amount    numeric(20,5) DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, invoice_id)
);

-- -----------------------------------------------------------
-- 19. Approvals
-- -----------------------------------------------------------
CREATE TABLE approvals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  entity_type NOT NULL,
  entity_id    uuid NOT NULL,
  action       approval_action NOT NULL,
  status       approval_status NOT NULL DEFAULT 'pending',
  comment      text,
  level_no     integer NOT NULL DEFAULT 1,
  approved_by  uuid REFERENCES app_users(id),
  approved_at  timestamptz,
  requested_by uuid REFERENCES app_users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 20. Approval Policies
-- -----------------------------------------------------------
CREATE TABLE approval_policies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  entity_type NOT NULL,
  role_id      uuid REFERENCES roles(id) ON DELETE RESTRICT,
  level_no     integer NOT NULL DEFAULT 1,
  min_amount   numeric(20,5) DEFAULT 0,
  max_amount   numeric(20,5),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 21. Month End
-- -----------------------------------------------------------
CREATE TABLE month_end (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code varchar(20) NOT NULL REFERENCES vendors(code),
  period_year  varchar(4) NOT NULL,
  period_month varchar(2) NOT NULL,
  open_amount  numeric(20,5) DEFAULT 0,
  open_dr      numeric(20,5) DEFAULT 0,
  open_apply   numeric(20,5) DEFAULT 0,
  open_paid    numeric(20,5) DEFAULT 0,
  open_balance numeric(20,5) DEFAULT 0,
  inv_amount   numeric(20,5) DEFAULT 0,
  dr_amount    numeric(20,5) DEFAULT 0,
  apply_amount numeric(20,5) DEFAULT 0,
  paid_amount  numeric(20,5) DEFAULT 0,
  balance      numeric(20,5) DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_code, period_year, period_month)
);

-- -----------------------------------------------------------
-- 22. Bank Reconciliations
-- -----------------------------------------------------------
CREATE TABLE bank_reconciliations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code     varchar(10),
  cheque_date   date,
  cheque_number varchar(30),
  remark        text,
  received_date date,
  amount        numeric(20,5) DEFAULT 0,
  supplier_code varchar(20) REFERENCES vendors(code),
  status        varchar(10) DEFAULT 'active',
  cancelled     boolean DEFAULT false,
  cancelled_at  timestamptz,
  cancelled_by  uuid REFERENCES app_users(id),
  cancel_reason text,
  created_by    uuid REFERENCES app_users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 23. Deposit Payments
-- -----------------------------------------------------------
CREATE TABLE deposit_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number    varchar(30) NOT NULL UNIQUE,
  supplier_code varchar(20) NOT NULL REFERENCES vendors(code),
  supplier_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  deposit_date  date NOT NULL,
  due_date      date,
  amount        numeric(20,5) DEFAULT 0,
  vat_amount    numeric(20,5) DEFAULT 0,
  vat_percent   numeric(5,2) DEFAULT 0,
  po_number    varchar(20),
  remark        text,
  pay_code      varchar(5),
  paid_by       varchar(50),
  cheque_number varchar(30),
  cheque_date   date,
  status        varchar(10) DEFAULT 'active',
  created_by    uuid REFERENCES app_users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 24. Cheque Transactions
-- -----------------------------------------------------------
CREATE TABLE cheque_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid REFERENCES payments(id) ON DELETE SET NULL,
  bank_code     varchar(10),
  bank_name     varchar(60),
  cheque_date   date,
  cheque_number varchar(30) NOT NULL,
  remark        text,
  cancelled     boolean DEFAULT false,
  cancelled_at  timestamptz,
  cancelled_by  uuid REFERENCES app_users(id),
  cancel_reason text,
  created_by    uuid REFERENCES app_users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 25. Withholding Taxes
-- -----------------------------------------------------------
CREATE TABLE withholding_taxes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid REFERENCES payments(id) ON DELETE SET NULL,
  doc_number      varchar(30),
  wht_code        varchar(5) NOT NULL,
  wht_rate        numeric(5,2) DEFAULT 0,
  base_amount     numeric(20,5) DEFAULT 0,
  tax_amount      numeric(20,5) DEFAULT 0,
  wht_code2       varchar(5),
  wht_rate2       numeric(5,2) DEFAULT 0,
  base_amount2    numeric(20,5) DEFAULT 0,
  tax_amount2     numeric(20,5) DEFAULT 0,
  cond_pay        smallint DEFAULT 3,
  remark          text,
  doc_date        date,
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 26. WHT Per Supplier
-- -----------------------------------------------------------
CREATE TABLE wht_per_supplier (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code   varchar(20) NOT NULL REFERENCES vendors(code),
  wht_number      integer NOT NULL,
  line_no         integer NOT NULL DEFAULT 1,
  remark          varchar(150),
  wht_date        date,
  wht_rate        numeric(5,2) DEFAULT 0,
  base_amount     numeric(20,5) DEFAULT 0,
  wht_amount      numeric(20,5) DEFAULT 0,
  wht_code2       varchar(5),
  wht_rate2       numeric(5,2) DEFAULT 0,
  base_amount2    numeric(20,5) DEFAULT 0,
  wht_amount2     numeric(20,5) DEFAULT 0,
  cancelled       boolean DEFAULT false,
  cancelled_at    timestamptz,
  cancelled_by    uuid REFERENCES app_users(id),
  cancel_reason   varchar(250),
  typewht         integer,
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_code, wht_number, line_no)
);

-- -----------------------------------------------------------
-- 27. Invoice Attachments
-- -----------------------------------------------------------
CREATE TABLE invoice_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  file_name     varchar(255) NOT NULL,
  file_size     bigint DEFAULT 0,
  content_type  varchar(100),
  storage_path  text NOT NULL,
  uploaded_by   uuid REFERENCES app_users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 28. Document Number Sequences
-- -----------------------------------------------------------
CREATE TABLE doc_number_sequences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name varchar(40) NOT NULL,
  field_name varchar(40) NOT NULL,
  group_key  varchar(40) NOT NULL DEFAULT '',
  last_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, field_name, group_key)
);

-- -----------------------------------------------------------
-- 29. Audit Logs
-- -----------------------------------------------------------
CREATE TABLE audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   varchar(80) NOT NULL,
  record_id    uuid,
  action       audit_action NOT NULL,
  old_data     jsonb,
  new_data     jsonb,
  performed_by uuid REFERENCES app_users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address   inet,
  detail       text
);

-- -----------------------------------------------------------
-- 30. Report Groups
-- -----------------------------------------------------------
CREATE TABLE report_groups (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code   varchar(10) NOT NULL UNIQUE,
  name   varchar(100) NOT NULL,
  tr_type varchar(5) DEFAULT 'AP'
);

-- -----------------------------------------------------------
-- 31. Reports
-- -----------------------------------------------------------
CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES report_groups(id) ON DELETE CASCADE,
  tr_type     varchar(5) DEFAULT 'AP',
  code        varchar(10) NOT NULL,
  name        varchar(200) NOT NULL,
  remark      text,
  report_file varchar(100),
  UNIQUE (group_id, tr_type, code)
);

-- -----------------------------------------------------------
-- 32. Report Permissions
-- -----------------------------------------------------------
CREATE TABLE report_permissions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  UNIQUE (report_id, user_id)
);

-- -----------------------------------------------------------
-- 33. i18n Messages
-- -----------------------------------------------------------
CREATE TABLE i18n_messages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key varchar(40) NOT NULL,
  table_key varchar(40) NOT NULL,
  lang      varchar(5) NOT NULL,
  message   varchar(500),
  UNIQUE (field_key, table_key, lang)
);




-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- -----------------------------------------------------------
-- next_doc_number : generate formatted next doc number
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION next_doc_number(
  p_table  varchar,
  p_field  varchar,
  p_group  varchar DEFAULT '',
  p_prefix varchar DEFAULT '',
  p_digits integer DEFAULT 5
) RETURNS varchar AS $$
DECLARE
  v_new_val integer;
  v_result  varchar;
BEGIN
  INSERT INTO doc_number_sequences (table_name, field_name, group_key, last_value)
  VALUES (p_table, p_field, p_group, 1)
  ON CONFLICT (table_name, field_name, group_key)
  DO UPDATE SET last_value = doc_number_sequences.last_value + 1,
                updated_at = now()
  RETURNING last_value INTO v_new_val;

  v_result := p_prefix || lpad(v_new_val::text, p_digits, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- assert_period_open : raise exception if period is closed
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_period_open(
  p_year  varchar,
  p_month varchar
) RETURNS void AS $$
DECLARE
  v_closed boolean;
BEGIN
  SELECT closed INTO v_closed
    FROM periods
   WHERE period_year  = p_year
     AND period_month = p_month;

  IF v_closed IS NULL THEN
    RAISE EXCEPTION 'Period %.% does not exist', p_year, p_month;
  END IF;

  IF v_closed THEN
    RAISE EXCEPTION 'Period %.% is already closed', p_year, p_month;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------
-- set_updated_at trigger function
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------
-- validate_invoice trigger function
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_invoice()
RETURNS trigger AS $$
BEGIN
  IF NEW.doc_date IS NULL THEN
    RAISE EXCEPTION 'Invoice doc_date is required';
  END IF;
  IF NEW.supplier_code IS NULL OR NEW.supplier_code = '' THEN
    RAISE EXCEPTION 'Invoice supplier_code is required';
  END IF;
  IF NEW.total_amount IS NULL THEN
    NEW.total_amount := 0;
  END IF;
  IF NEW.balance IS NULL THEN
    NEW.balance := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------
-- auto_payment_number trigger function
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_payment_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.doc_number IS NULL OR NEW.doc_number = '' THEN
    NEW.doc_number := next_doc_number('payments', 'doc_number', 'PAY', 'PAY');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;




-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at triggers for all tables with updated_at column
CREATE TRIGGER set_updated_at_roles        BEFORE UPDATE ON roles                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_app_users    BEFORE UPDATE ON app_users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_config       BEFORE UPDATE ON config               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_vendors      BEFORE UPDATE ON vendors              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_vendor_monthly_balances BEFORE UPDATE ON vendor_monthly_balances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_periods      BEFORE UPDATE ON periods              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_invoices     BEFORE UPDATE ON invoices             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_invoice_items BEFORE UPDATE ON invoice_items       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_payments     BEFORE UPDATE ON payments             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_payment_items BEFORE UPDATE ON payment_items       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_month_end    BEFORE UPDATE ON month_end            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_bank_reconciliations BEFORE UPDATE ON bank_reconciliations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_deposit_payments     BEFORE UPDATE ON deposit_payments      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_cheque_transactions  BEFORE UPDATE ON cheque_transactions   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_withholding_taxes    BEFORE UPDATE ON withholding_taxes     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_wht_per_supplier     BEFORE UPDATE ON wht_per_supplier      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_ap_types       BEFORE UPDATE ON ap_types             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_vat_codes     BEFORE UPDATE ON vat_codes            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_wht_codes     BEFORE UPDATE ON wht_codes            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_payment_codes BEFORE UPDATE ON payment_codes        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approvals     BEFORE UPDATE ON approvals            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approval_policies BEFORE UPDATE ON approval_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_doc_number_sequences BEFORE UPDATE ON doc_number_sequences FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Validate invoice before insert/update
CREATE TRIGGER validate_invoice BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION validate_invoice();

-- Auto-generate payment number
CREATE TRIGGER auto_payment_number BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION auto_payment_number();




-- -----------------------------------------------------------
-- 34. Bank Accounts (for bank reconciliation dropdown)
-- -----------------------------------------------------------
CREATE TABLE bank_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(10) NOT NULL UNIQUE,
  name        varchar(60) NOT NULL,
  account_no  varchar(30),
  branch      varchar(60),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 35. GL Accounts (chart of accounts)
-- -----------------------------------------------------------
CREATE TABLE gl_accounts (
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

-- -----------------------------------------------------------
-- 36. Deposit Payment Items (detail lines for deposit)
-- -----------------------------------------------------------
CREATE TABLE deposit_payment_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id        uuid NOT NULL REFERENCES deposit_payments(id) ON DELETE CASCADE,
  line_no           integer NOT NULL,
  gl_account        varchar(20),
  description       varchar(200),
  dr_amount         numeric(20,5) DEFAULT 0,
  cr_amount         numeric(20,5) DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deposit_id, line_no)
);

-- -----------------------------------------------------------
-- 37. Transfers
-- -----------------------------------------------------------
CREATE TABLE transfers (
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

-- Triggers for new tables
CREATE TRIGGER set_updated_at_bank_accounts BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_gl_accounts BEFORE UPDATE ON gl_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_deposit_payment_items BEFORE UPDATE ON deposit_payment_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_transfers BEFORE UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS for new tables
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_payment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts: authenticated can read"
  ON bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts: admin can manage"
  ON bank_accounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN')));

CREATE POLICY "gl_accounts: authenticated can read"
  ON gl_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "gl_accounts: admin can manage"
  ON gl_accounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN')));

CREATE POLICY "deposit_payment_items: authenticated can read"
  ON deposit_payment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "deposit_payment_items: ap_role can write"
  ON deposit_payment_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')));

-- ---------- TRANSFERS ----------
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

-- Seed data for new tables
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


-- ============================================================
-- INDEXES
-- ============================================================

-- Vendors
CREATE INDEX idx_vendors_code        ON vendors (code);
CREATE INDEX idx_vendors_name_en     ON vendors (name_en);
CREATE INDEX idx_vendors_is_active   ON vendors (is_active);
CREATE INDEX idx_vendors_wht_code    ON vendors (wht_code);
CREATE INDEX idx_vendors_vat_code    ON vendors (vat_code);

-- Invoices
CREATE INDEX idx_invoices_doc_number    ON invoices (doc_number);
CREATE INDEX idx_invoices_supplier_code ON invoices (supplier_code);
CREATE INDEX idx_invoices_supplier_id   ON invoices (supplier_id);
CREATE INDEX idx_invoices_doc_date      ON invoices (doc_date);
CREATE INDEX idx_invoices_status        ON invoices (status);
CREATE INDEX idx_invoices_period        ON invoices (period_year, period_month);
CREATE INDEX idx_invoices_inv_number    ON invoices (inv_number);
CREATE INDEX idx_invoices_due_date       ON invoices (due_date);
CREATE INDEX idx_invoices_created_by    ON invoices (created_by);

-- Invoice Items
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);

-- Payments
CREATE INDEX idx_payments_doc_number    ON payments (doc_number);
CREATE INDEX idx_payments_supplier_code ON payments (supplier_code);
CREATE INDEX idx_payments_supplier_id   ON payments (supplier_id);
CREATE INDEX idx_payments_doc_date      ON payments (doc_date);
CREATE INDEX idx_payments_status        ON payments (status);
CREATE INDEX idx_payments_period        ON payments (period_year, period_month);
CREATE INDEX idx_payments_cheque_number ON payments (cheque_number);
CREATE INDEX idx_payments_created_by    ON payments (created_by);

-- Payment Items
CREATE INDEX idx_payment_items_payment_id ON payment_items (payment_id);

-- Payment Invoices
CREATE INDEX idx_payment_invoices_payment_id ON payment_invoices (payment_id);
CREATE INDEX idx_payment_invoices_invoice_id ON payment_invoices (invoice_id);

-- Approvals
CREATE INDEX idx_approvals_entity      ON approvals (entity_type, entity_id);
CREATE INDEX idx_approvals_status       ON approvals (status);
CREATE INDEX idx_approvals_requested_by ON approvals (requested_by);
CREATE INDEX idx_approvals_approved_by  ON approvals (approved_by);

-- Approval Policies
CREATE INDEX idx_approval_policies_entity ON approval_policies (entity_type);
CREATE INDEX idx_approval_policies_role    ON approval_policies (role_id);

-- Periods
CREATE INDEX idx_periods_year_month ON periods (period_year, period_month);
CREATE INDEX idx_periods_closed ON periods (closed);

-- Vendor Monthly Balances
CREATE INDEX idx_vendor_monthly_balances_vendor ON vendor_monthly_balances (vendor_id);
CREATE INDEX idx_vendor_monthly_balances_period ON vendor_monthly_balances (period_year, period_month);

-- Month End
CREATE INDEX idx_month_end_supplier ON month_end (supplier_code);
CREATE INDEX idx_month_end_period   ON month_end (period_year, period_month);

-- Bank Reconciliations
CREATE INDEX idx_bank_reconciliations_cheque ON bank_reconciliations (cheque_number);
CREATE INDEX idx_bank_reconciliations_supplier ON bank_reconciliations (supplier_code);

-- Cheque Transactions
CREATE INDEX idx_cheque_transactions_cheque   ON cheque_transactions (cheque_number);
CREATE INDEX idx_cheque_transactions_payment  ON cheque_transactions (payment_id);

-- Withholding Taxes
CREATE INDEX idx_withholding_taxes_payment   ON withholding_taxes (payment_id);
CREATE INDEX idx_withholding_taxes_wht_code  ON withholding_taxes (wht_code);

-- WHT Per Supplier
CREATE INDEX idx_wht_per_supplier_supplier ON wht_per_supplier (supplier_code);
CREATE INDEX idx_wht_per_supplier_date     ON wht_per_supplier (wht_date);

-- Deposit Payments
CREATE INDEX idx_deposit_payments_doc_number ON deposit_payments (doc_number);
CREATE INDEX idx_deposit_payments_supplier   ON deposit_payments (supplier_code);

-- Invoice Attachments
CREATE INDEX idx_invoice_attachments_invoice ON invoice_attachments (invoice_id);

-- Audit Logs
CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_action       ON audit_logs (action);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs (performed_by);
CREATE INDEX idx_audit_logs_performed_at ON audit_logs (performed_at);

-- Users
CREATE INDEX idx_app_users_login_name ON app_users (login_name);
CREATE INDEX idx_app_users_auth_uid   ON app_users (auth_uid);

-- User Roles
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- i18n
CREATE INDEX idx_i18n_messages_lang ON i18n_messages (lang);
CREATE INDEX idx_i18n_messages_table ON i18n_messages (table_key);




-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all data tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_monthly_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_end ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheque_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_per_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE i18n_messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- Helper: authenticated user has at least one role
-- A JWT custom claim "role" is set by Supabase Auth hook
-- -----------------------------------------------------------

-- ---------- ROLES ----------
CREATE POLICY "roles: all authenticated users can read"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roles: admin can manage"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- APP_USERS ----------
CREATE POLICY "app_users: read own profile or admin"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    auth_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

CREATE POLICY "app_users: admin can insert"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

CREATE POLICY "app_users: update own profile or admin"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    auth_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

CREATE POLICY "app_users: admin can delete"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- USER_ROLES ----------
CREATE POLICY "user_roles: read own or admin"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

CREATE POLICY "user_roles: admin can manage"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- ROLE_RIGHTS ----------
CREATE POLICY "role_rights: authenticated can read"
  ON role_rights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "role_rights: admin can manage"
  ON role_rights FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- CONFIG ----------
CREATE POLICY "config: authenticated can read"
  ON config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "config: admin can manage"
  ON config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- VENDORS ----------
CREATE POLICY "vendors: authenticated can read"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "vendors: ap_role can write"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "vendors: ap_role can update"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "vendors: admin can delete"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- VENDOR_MONTHLY_BALANCES ----------
CREATE POLICY "vendor_monthly_balances: authenticated can read"
  ON vendor_monthly_balances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "vendor_monthly_balances: ap_role can write"
  ON vendor_monthly_balances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- AP_TYPES ----------
CREATE POLICY "ap_types: authenticated can read"
  ON ap_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ap_types: admin can manage"
  ON ap_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- VAT_CODES ----------
CREATE POLICY "vat_codes: authenticated can read"
  ON vat_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "vat_codes: admin can manage"
  ON vat_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- WHT_CODES ----------
CREATE POLICY "wht_codes: authenticated can read"
  ON wht_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "wht_codes: admin can manage"
  ON wht_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- PAYMENT_CODES ----------
CREATE POLICY "payment_codes: authenticated can read"
  ON payment_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payment_codes: admin can manage"
  ON payment_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- PERIODS ----------
CREATE POLICY "periods: authenticated can read"
  ON periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "periods: admin can manage"
  ON periods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- INVOICES ----------
CREATE POLICY "invoices: authenticated can read"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "invoices: ap_role can insert"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "invoices: ap_role can update"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "invoices: admin can delete"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- INVOICE_ITEMS ----------
CREATE POLICY "invoice_items: authenticated can read"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "invoice_items: ap_role can write"
  ON invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- PAYMENTS ----------
CREATE POLICY "payments: authenticated can read"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payments: ap_role can insert"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "payments: ap_role can update"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "payments: admin can delete"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- PAYMENT_ITEMS ----------
CREATE POLICY "payment_items: authenticated can read"
  ON payment_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payment_items: ap_role can write"
  ON payment_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- PAYMENT_INVOICES ----------
CREATE POLICY "payment_invoices: authenticated can read"
  ON payment_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payment_invoices: ap_role can write"
  ON payment_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- APPROVALS ----------
CREATE POLICY "approvals: authenticated can read related"
  ON approvals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "approvals: ap_role can insert"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "approvals: approver can update"
  ON approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_MANAGER','APPROVER')
    )
  );

-- ---------- APPROVAL_POLICIES ----------
CREATE POLICY "approval_policies: authenticated can read"
  ON approval_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "approval_policies: admin can manage"
  ON approval_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- MONTH_END ----------
CREATE POLICY "month_end: authenticated can read"
  ON month_end FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "month_end: ap_role can write"
  ON month_end FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- BANK_RECONCILIATIONS ----------
CREATE POLICY "bank_reconciliations: authenticated can read"
  ON bank_reconciliations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bank_reconciliations: ap_role can write"
  ON bank_reconciliations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- DEPOSIT_PAYMENTS ----------
CREATE POLICY "deposit_payments: authenticated can read"
  ON deposit_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "deposit_payments: ap_role can write"
  ON deposit_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- CHEQUE_TRANSACTIONS ----------
CREATE POLICY "cheque_transactions: authenticated can read"
  ON cheque_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cheque_transactions: ap_role can write"
  ON cheque_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- WITHHOLDING_TAXES ----------
CREATE POLICY "withholding_taxes: authenticated can read"
  ON withholding_taxes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "withholding_taxes: ap_role can write"
  ON withholding_taxes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- WHT_PER_SUPPLIER ----------
CREATE POLICY "wht_per_supplier: authenticated can read"
  ON wht_per_supplier FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "wht_per_supplier: ap_role can write"
  ON wht_per_supplier FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- INVOICE_ATTACHMENTS ----------
CREATE POLICY "invoice_attachments: authenticated can read"
  ON invoice_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "invoice_attachments: ap_role can insert"
  ON invoice_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "invoice_attachments: ap_role can delete"
  ON invoice_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

-- ---------- DOC_NUMBER_SEQUENCES ----------
CREATE POLICY "doc_number_sequences: service_role only"
  ON doc_number_sequences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- AUDIT_LOGS ----------
CREATE POLICY "audit_logs: authenticated can read own or admin"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

CREATE POLICY "audit_logs: system can insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---------- REPORT_GROUPS ----------
CREATE POLICY "report_groups: authenticated can read"
  ON report_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "report_groups: admin can manage"
  ON report_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- REPORTS ----------
CREATE POLICY "reports: authenticated can read authorized"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "reports: admin can manage"
  ON reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- REPORT_PERMISSIONS ----------
CREATE POLICY "report_permissions: read own or admin"
  ON report_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

CREATE POLICY "report_permissions: admin can manage"
  ON report_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );

-- ---------- I18N_MESSAGES ----------
CREATE POLICY "i18n_messages: authenticated can read"
  ON i18n_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "i18n_messages: admin can manage"
  ON i18n_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN')
    )
  );




-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-attachments',
  'invoice-attachments',
  false,
  10485760,
  ARRAY['application/pdf','image/png','image/jpeg','image/gif','image/webp','application/zip']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoice-attachments bucket
CREATE POLICY "invoice-attachments: authenticated can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "invoice-attachments: authenticated can read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "invoice-attachments: admin can read all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments'
    AND EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );

CREATE POLICY "invoice-attachments: ap users can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments'
    AND EXISTS (
      SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = auth.uid()
         AND r.code IN ('ADMIN','SUPERADMIN','AP_USER','AP_MANAGER')
    )
  );




-- ============================================================
-- APPROVAL WORKFLOW FUNCTIONS
-- ============================================================

-- -----------------------------------------------------------
-- request_approval : submit entity for approval
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION request_approval(
  p_entity_type entity_type,
  p_entity_id   uuid,
  p_comment     text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_approval_id uuid;
  v_user_id     uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  INSERT INTO approvals (entity_type, entity_id, action, status, comment, requested_by, level_no)
  VALUES (p_entity_type, p_entity_id, 'submit', 'pending', p_comment, v_user_id, 1)
  RETURNING id INTO v_approval_id;

  -- Update the source entity status
  IF p_entity_type = 'invoice' THEN
    UPDATE invoices SET status = 'pending_approval' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'payment' THEN
    UPDATE payments SET status = 'pending_approval' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'deposit' THEN
    UPDATE deposit_payments SET status = 'pending_approval' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'bank_reconciliation' THEN
    UPDATE bank_reconciliations SET status = 'pending_approval' WHERE id = p_entity_id;
  END IF;

  RETURN v_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- approve_entity : approve a pending approval
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_entity(
  p_approval_id uuid,
  p_comment     text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_entity_type entity_type;
  v_entity_id   uuid;
  v_level_no    integer;
  v_user_id     uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT entity_type, entity_id, level_no
    INTO v_entity_type, v_entity_id, v_level_no
    FROM approvals
   WHERE id = p_approval_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found or not in pending status';
  END IF;

  -- Check if the current user has approval rights for this level
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
      JOIN approval_policies ap ON ap.role_id = ur.role_id
     WHERE ur.user_id = v_user_id
       AND ap.entity_type = v_entity_type
       AND ap.level_no = v_level_no
       AND ap.is_active = true
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = v_user_id
       AND r.code IN ('ADMIN','SUPERADMIN')
  ) THEN
    RAISE EXCEPTION 'User does not have approval rights for this level';
  END IF;

  -- Update the approval record
  UPDATE approvals
     SET status      = 'approved',
         action      = 'approve',
         approved_by = v_user_id,
         approved_at = now(),
         comment     = COALESCE(p_comment, comment)
   WHERE id = p_approval_id;

  -- Update the source entity status
  IF v_entity_type = 'invoice' THEN
    UPDATE invoices SET status = 'approved' WHERE id = v_entity_id;
  ELSIF v_entity_type = 'payment' THEN
    UPDATE payments SET status = 'approved' WHERE id = v_entity_id;
  ELSIF v_entity_type = 'deposit' THEN
    UPDATE deposit_payments SET status = 'approved' WHERE id = v_entity_id;
  ELSIF v_entity_type = 'bank_reconciliation' THEN
    UPDATE bank_reconciliations SET status = 'approved' WHERE id = v_entity_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- reject_entity : reject a pending approval
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_entity(
  p_approval_id uuid,
  p_comment     text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_entity_type entity_type;
  v_entity_id   uuid;
  v_user_id     uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT entity_type, entity_id
    INTO v_entity_type, v_entity_id
    FROM approvals
   WHERE id = p_approval_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found or not in pending status';
  END IF;

  -- Update the approval record
  UPDATE approvals
     SET status      = 'rejected',
         action      = 'reject',
         approved_by = v_user_id,
         approved_at = now(),
         comment     = COALESCE(p_comment, comment)
   WHERE id = p_approval_id;

  -- Update the source entity status
  IF v_entity_type = 'invoice' THEN
    UPDATE invoices SET status = 'rejected' WHERE id = v_entity_id;
  ELSIF v_entity_type = 'payment' THEN
    UPDATE payments SET status = 'rejected' WHERE id = v_entity_id;
  ELSIF v_entity_type = 'deposit' THEN
    UPDATE deposit_payments SET status = 'rejected' WHERE id = v_entity_id;
  ELSIF v_entity_type = 'bank_reconciliation' THEN
    UPDATE bank_reconciliations SET status = 'rejected' WHERE id = v_entity_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




-- ============================================================
-- SEED DATA
-- ============================================================

-- -----------------------------------------------------------
-- Seed: Roles
-- -----------------------------------------------------------
INSERT INTO roles (code, name, name_th, description, is_system) VALUES
  ('SUPERADMIN', 'Super Administrator', 'ผู้ดูแลระบบขั้นสูง', 'Full system access, can manage all settings and users', true),
  ('ADMIN',      'Administrator',       'ผู้ดูแลระบบ',         'System administrator, can manage most settings', true),
  ('AP_MANAGER', 'AP Manager',          'ผู้จัดการเจ้าหนี้',    'Can approve invoices, payments, and manage AP operations', false),
  ('AP_USER',    'AP User',             'ผู้ใช้เจ้าหนี้',       'Can create and edit invoices and payments', false),
  ('APPROVER',   'Approver',            'ผู้อนุมัติ',           'Can approve or reject submitted documents', false),
  ('VIEWER',     'Viewer',              'ผู้ดู',                'Read-only access to AP data', false);


-- -----------------------------------------------------------
-- Seed: Role Rights
-- -----------------------------------------------------------
-- SUPERADMIN – full access (resource:*:*)
INSERT INTO role_rights (role_id, resource, action, permitted) SELECT id, '*', '*', true FROM roles WHERE code = 'SUPERADMIN';

-- ADMIN – full access
INSERT INTO role_rights (role_id, resource, action, permitted) SELECT id, '*', '*', true FROM roles WHERE code = 'ADMIN';

-- AP_MANAGER – AP resources
INSERT INTO role_rights (role_id, resource, action, permitted)
SELECT r.id, v.resource, v.action, true
  FROM roles r
 CROSS JOIN (VALUES
    ('invoices','create'),('invoices','read'),('invoices','update'),('invoices','delete'),
    ('payments','create'),('payments','read'),('payments','update'),('payments','delete'),
    ('vendors','create'),('vendors','read'),('vendors','update'),('vendors','delete'),
    ('invoices','approve'),('payments','approve'),
    ('deposits','create'),('deposits','read'),('deposits','update'),('deposits','delete'),
    ('bank_reconciliations','create'),('bank_reconciliations','read'),('bank_reconciliations','update'),
    ('withholding_taxes','create'),('withholding_taxes','read'),('withholding_taxes','update'),
    ('reports','read'),('reports','export'),
    ('periods','read')
 ) AS v(resource, action)
 WHERE r.code = 'AP_MANAGER';

-- AP_USER – basic AP CRUD
INSERT INTO role_rights (role_id, resource, action, permitted)
SELECT r.id, v.resource, v.action, true
  FROM roles r
 CROSS JOIN (VALUES
    ('invoices','create'),('invoices','read'),('invoices','update'),
    ('payments','create'),('payments','read'),('payments','update'),
    ('vendors','create'),('vendors','read'),('vendors','update'),
    ('deposits','create'),('deposits','read'),('deposits','update'),
    ('reports','read')
 ) AS v(resource, action)
 WHERE r.code = 'AP_USER';

-- APPROVER – read + approve only
INSERT INTO role_rights (role_id, resource, action, permitted)
SELECT r.id, v.resource, v.action, true
  FROM roles r
 CROSS JOIN (VALUES
    ('invoices','read'),('invoices','approve'),
    ('payments','read'),('payments','approve'),
    ('deposits','read'),('deposits','approve'),
    ('bank_reconciliations','read'),('bank_reconciliations','approve')
 ) AS v(resource, action)
 WHERE r.code = 'APPROVER';

-- VIEWER – read only
INSERT INTO role_rights (role_id, resource, action, permitted)
SELECT r.id, v.resource, v.action, true
  FROM roles r
 CROSS JOIN (VALUES
    ('invoices','read'),('payments','read'),('vendors','read'),
    ('deposits','read'),('reports','read'),
    ('bank_reconciliations','read'),('withholding_taxes','read')
 ) AS v(resource, action)
 WHERE r.code = 'VIEWER';


-- -----------------------------------------------------------
-- Seed: Config (default company)
-- -----------------------------------------------------------
INSERT INTO config (
  company_code, company_name_en, company_name_th,
  vat_percent, wht_percent,
  default_lang, currency, auto_doc_no
) VALUES (
  'KSAP',
  'KSAP Company Limited',
  'บริษัท เคแซพ จำกัด',
  7.00,
  3.00,
  'en',
  'THB',
  true
);


-- -----------------------------------------------------------
-- Seed: AP Types
-- -----------------------------------------------------------
INSERT INTO ap_types (code, name) VALUES
  ('AP',   'Accounts Payable'),
  ('CR',   'Credit Note'),
  ('DR',   'Debit Note'),
  ('DP',   'Deposit'),
  ('ADJ',  'Adjustment'),
  ('TRANS', 'Transfer');


-- -----------------------------------------------------------
-- Seed: VAT Codes
-- -----------------------------------------------------------
INSERT INTO vat_codes (code, rate, description, gl_account) VALUES
  ('V07', 7.00, 'VAT 7%',       '2101'),
  ('V00', 0.00, 'VAT 0%',       '2102'),
  ('VEX', 0.00, 'VAT Exempt',   '2103'),
  ('VNO', 0.00, 'No VAT',       NULL);


-- -----------------------------------------------------------
-- Seed: WHT Codes
-- -----------------------------------------------------------
INSERT INTO wht_codes (code, rate, description, gl_account, assign_zero) VALUES
  ('W01', 3.00,  'Withholding Tax 3% (Service)',            '2201', false),
  ('W02', 5.00,  'Withholding Tax 5% (Service)',            '2202', false),
  ('W03', 1.00,  'Withholding Tax 1% (Advertising)',        '2203', false),
  ('W04', 10.00, 'Withholding Tax 10% (Government)',        '2204', false),
  ('W05', 0.00,  'Withholding Tax 0% (Exempt)',             '2205', true),
  ('W06', 1.50,  'Withholding Tax 1.5% (Company Service)',  '2206', false),
  ('W07', 3.00,  'Withholding Tax 3% (Rental)',            '2207', false);


-- -----------------------------------------------------------
-- Seed: Payment Codes
-- -----------------------------------------------------------
INSERT INTO payment_codes (code, description, gl_account) VALUES
  ('CSH', 'Cash Payment',      '1101'),
  ('CHQ', 'Cheque Payment',    '1102'),
  ('TRF', 'Bank Transfer',     '1103'),
  ('CRD', 'Credit Card',       '1104'),
  ('OFF', 'Offset',            '1105'),
  ('DP',  'Deposit Applied',  '1106');


-- -----------------------------------------------------------
-- Seed: i18n Messages (EN / TH)
-- -----------------------------------------------------------
INSERT INTO i18n_messages (field_key, table_key, lang, message) VALUES
  -- Config
  ('C001', 'CONFIG', 'EN', 'Company Code'),
  ('C002', 'CONFIG', 'EN', 'Company Name'),
  ('C003', 'CONFIG', 'EN', 'VAT Rate'),
  ('C004', 'CONFIG', 'EN', 'WHT Rate'),
  ('C005', 'CONFIG', 'EN', 'Currency'),
  ('C006', 'CONFIG', 'EN', 'Language'),
  ('C007', 'CONFIG', 'EN', 'Auto Document No'),
  ('C001', 'CONFIG', 'TH', 'รหัสบริษัท'),
  ('C002', 'CONFIG', 'TH', 'ชื่อบริษัท'),
  ('C003', 'CONFIG', 'TH', 'อัตรา VAT'),
  ('C004', 'CONFIG', 'TH', 'อัตรา WHT'),
  ('C005', 'CONFIG', 'TH', 'สกุลเงิน'),
  ('C006', 'CONFIG', 'TH', 'ภาษา'),
  ('C007', 'CONFIG', 'TH', 'สร้างเลขที่เอกสารอัตโนมัติ'),
  -- Vendor fields
  ('V001', 'VENDOR',  'EN', 'Vendor Code'),
  ('V002', 'VENDOR',  'EN', 'Vendor Name'),
  ('V003', 'VENDOR',  'EN', 'Address'),
  ('V004', 'VENDOR',  'EN', 'Telephone'),
  ('V005', 'VENDOR',  'EN', 'Fax'),
  ('V006', 'VENDOR',  'EN', 'Email'),
  ('V007', 'VENDOR',  'EN', 'Tax ID'),
  ('V008', 'VENDOR',  'EN', 'Credit Term (days)'),
  ('V009', 'VENDOR',  'EN', 'WHT Code'),
  ('V010', 'VENDOR',  'EN', 'VAT Code'),
  ('V001', 'VENDOR',  'TH', 'รหัสผู้จัดจำหน่าย'),
  ('V002', 'VENDOR',  'TH', 'ชื่อผู้จัดจำหน่าย'),
  ('V003', 'VENDOR',  'TH', 'ที่อยู่'),
  ('V004', 'VENDOR',  'TH', 'โทรศัพท์'),
  ('V005', 'VENDOR',  'TH', 'แฟกซ์'),
  ('V006', 'VENDOR',  'TH', 'อีเมล'),
  ('V007', 'VENDOR',  'TH', 'เลขประจำตัวผู้เสียภาษี'),
  ('V008', 'VENDOR',  'TH', 'เครดิตเทอม (วัน)'),
  ('V009', 'VENDOR',  'TH', 'รหัสหัก ณ ที่จ่าย'),
  ('V010', 'VENDOR',  'TH', 'รหัส VAT'),
  -- Invoice fields
  ('I001', 'INVOICE', 'EN', 'Document No'),
  ('I002', 'INVOICE', 'EN', 'Document Date'),
  ('I003', 'INVOICE', 'EN', 'Supplier'),
  ('I004', 'INVOICE', 'EN', 'Invoice No'),
  ('I005', 'INVOICE', 'EN', 'Invoice Date'),
  ('I006', 'INVOICE', 'EN', 'Due Date'),
  ('I007', 'INVOICE', 'EN', 'Amount'),
  ('I008', 'INVOICE', 'EN', 'VAT'),
  ('I009', 'INVOICE', 'EN', 'WHT'),
  ('I010', 'INVOICE', 'EN', 'Total'),
  ('I011', 'INVOICE', 'EN', 'Status'),
  ('I012', 'INVOICE', 'EN', 'Remark'),
  ('I001', 'INVOICE', 'TH', 'เลขที่เอกสาร'),
  ('I002', 'INVOICE', 'TH', 'วันที่เอกสาร'),
  ('I003', 'INVOICE', 'TH', 'ผู้จัดจำหน่าย'),
  ('I004', 'INVOICE', 'TH', 'เลขที่ใบแจ้งหนี้'),
  ('I005', 'INVOICE', 'TH', 'วันที่ใบแจ้งหนี้'),
  ('I006', 'INVOICE', 'TH', 'วันครบกำหนด'),
  ('I007', 'INVOICE', 'TH', 'จำนวนเงิน'),
  ('I008', 'INVOICE', 'TH', 'ภาษีมูลค่าเพิ่ม'),
  ('I009', 'INVOICE', 'TH', 'หัก ณ ที่จ่าย'),
  ('I010', 'INVOICE', 'TH', 'ยอดรวม'),
  ('I011', 'INVOICE', 'TH', 'สถานะ'),
  ('I012', 'INVOICE', 'TH', 'หมายเหตุ'),
  -- Payment fields
  ('P001', 'PAYMENT', 'EN', 'Payment No'),
  ('P002', 'PAYMENT', 'EN', 'Payment Date'),
  ('P003', 'PAYMENT', 'EN', 'Supplier'),
  ('P004', 'PAYMENT', 'EN', 'Payment Method'),
  ('P005', 'PAYMENT', 'EN', 'Cheque No'),
  ('P006', 'PAYMENT', 'EN', 'Bank'),
  ('P007', 'PAYMENT', 'EN', 'Amount'),
  ('P008', 'PAYMENT', 'EN', 'WHT'),
  ('P009', 'PAYMENT', 'EN', 'Net Amount'),
  ('P010', 'PAYMENT', 'EN', 'Status'),
  ('P001', 'PAYMENT', 'TH', 'เลขที่ชำระเงิน'),
  ('P002', 'PAYMENT', 'TH', 'วันที่ชำระเงิน'),
  ('P003', 'PAYMENT', 'TH', 'ผู้จัดจำหน่าย'),
  ('P004', 'PAYMENT', 'TH', 'วิธีการชำระเงิน'),
  ('P005', 'PAYMENT', 'TH', 'เลขที่เช็ค'),
  ('P006', 'PAYMENT', 'TH', 'ธนาคาร'),
  ('P007', 'PAYMENT', 'TH', 'จำนวนเงิน'),
  ('P008', 'PAYMENT', 'TH', 'หัก ณ ที่จ่าย'),
  ('P009', 'PAYMENT', 'TH', 'ยอดสุทธิ'),
  ('P010', 'PAYMENT', 'TH', 'สถานะ'),
  -- Deposit fields
  ('D001', 'DP', 'EN', 'Deposit No'),
  ('D002', 'DP', 'EN', 'Supplier'),
  ('D003', 'DP', 'EN', 'Outstanding'),
  ('D004', 'DP', 'EN', 'Amount'),
  ('D005', 'DP', 'EN', 'VAT %'),
  ('D006', 'DP', 'EN', 'VAT Amount'),
  ('D007', 'DP', 'EN', 'Date'),
  ('D008', 'DP', 'EN', 'Due Date'),
  ('D009', 'DP', 'EN', 'Remark'),
  ('D010', 'DP', 'EN', 'Pay By'),
  ('D011', 'DP', 'EN', 'Bank'),
  ('D012', 'DP', 'EN', 'Cheque'),
  ('D013', 'DP', 'EN', 'Cheque Date'),
  ('D001', 'DP', 'TH', 'เลขที่มัดจำ'),
  ('D002', 'DP', 'TH', 'ผู้จัดจำหน่าย'),
  ('D003', 'DP', 'TH', 'ยอดค้างชำระ'),
  ('D004', 'DP', 'TH', 'จำนวนเงิน'),
  ('D005', 'DP', 'TH', 'VAT %'),
  ('D006', 'DP', 'TH', 'จำนวน VAT'),
  ('D007', 'DP', 'TH', 'วันที่'),
  ('D008', 'DP', 'TH', 'วันครบกำหนด'),
  ('D009', 'DP', 'TH', 'หมายเหตุ'),
  ('D010', 'DP', 'TH', 'ชำระโดย'),
  ('D011', 'DP', 'TH', 'ธนาคาร'),
  ('D012', 'DP', 'TH', 'เลขที่เช็ค'),
  ('D013', 'DP', 'TH', 'วันที่เช็ค');


-- ============================================================
-- Done
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS (RPC)
-- ============================================================

-- -----------------------------------------------------------
-- next_doc_number: Generate sequential document numbers
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- recalculate_vendor_balance: Recompute vendor balance
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_vendor_balance(
  p_vendor_id UUID
) RETURNS VOID AS $$
DECLARE
  v_open_amount NUMERIC;
  v_total_amount NUMERIC;
  v_total_payment NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(paid_amount), 0)
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

-- -----------------------------------------------------------
-- mark_cheque_cleared: Mark cheque as cleared
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_cheque_cleared(
  p_cheque_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE cheque_transactions
     SET remark = COALESCE(remark, '') || ' [CLEARED]'
   WHERE id = p_cheque_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- set_updated_at: Trigger function for updated_at
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;