-- ============================================================
-- KSAP Seed Data
-- ============================================================

-- Roles
INSERT INTO roles (code, name, name_th, description, is_system) VALUES
  ('SUPERADMIN', 'Super Administrator', 'ผู้ดูแลระบบขั้นสูง', 'Full system access', true),
  ('ADMIN', 'Administrator', 'ผู้ดูแลระบบ', 'System administrator', true),
  ('AP_MANAGER', 'AP Manager', 'ผู้จัดการเจ้าหนี้', 'Can approve AP documents', false),
  ('AP_USER', 'AP User', 'ผู้ใช้เจ้าหนี้', 'Can create and edit AP documents', false),
  ('APPROVER', 'Approver', 'ผู้อนุมัติ', 'Can approve submitted documents', false),
  ('VIEWER', 'Viewer', 'ผู้ดู', 'Read-only access', false)
ON CONFLICT (code) DO NOTHING;

-- Default company config
INSERT INTO config (company_code, company_name_en, company_name_th, vat_percent, wht_percent, default_lang, currency, auto_doc_no) VALUES
  ('KSAP', 'KSAP Company Limited', 'บริษัท เคแซพ จำกัด', 7.00, 3.00, 'en', 'THB', true)
ON CONFLICT (company_code) DO NOTHING;

-- AP Types
INSERT INTO ap_types (code, name) VALUES
  ('AP', 'Accounts Payable'),
  ('DR', 'Debit Note'),
  ('DP', 'Deposit'),
  ('ADJ', 'Adjustment'),
  ('TRN', 'Transfer')
ON CONFLICT (code) DO NOTHING;

-- VAT Codes
INSERT INTO vat_codes (code, rate, description, gl_account) VALUES
  ('V07', 7.00, 'VAT 7%', '2101'),
  ('V00', 0.00, 'VAT 0%', '2102'),
  ('VEX', 0.00, 'VAT Exempt', '2103'),
  ('VNO', 0.00, 'No VAT', NULL)
ON CONFLICT (code) DO NOTHING;

-- WHT Codes
INSERT INTO wht_codes (code, rate, description, gl_account, assign_zero) VALUES
  ('W01', 3.00, 'WHT 3% (Service)', '2201', false),
  ('W02', 5.00, 'WHT 5% (Service)', '2202', false),
  ('W03', 1.00, 'WHT 1% (Advertising)', '2203', false),
  ('W05', 0.00, 'WHT 0% (Exempt)', '2205', true),
  ('W06', 1.50, 'WHT 1.5% (Company)', '2206', false),
  ('W07', 3.00, 'WHT 3% (Rental)', '2207', false)
ON CONFLICT (code) DO NOTHING;

-- Payment Codes
INSERT INTO payment_codes (code, description, gl_account) VALUES
  ('CSH', 'Cash Payment', '1101'),
  ('CHQ', 'Cheque Payment', '1102'),
  ('TRF', 'Bank Transfer', '1103'),
  ('CRD', 'Credit Card', '1104'),
  ('OFF', 'Offset', '1105'),
  ('DP', 'Deposit Applied', '1106')
ON CONFLICT (code) DO NOTHING;

-- Periods: January 2025 – December 2025
INSERT INTO periods (period_year, period_month, date_from, date_to, closed) VALUES
  ('2025', '01', '2025-01-01', '2025-01-31', false),
  ('2025', '02', '2025-02-01', '2025-02-28', false),
  ('2025', '03', '2025-03-01', '2025-03-31', false),
  ('2025', '04', '2025-04-01', '2025-04-30', false),
  ('2025', '05', '2025-05-01', '2025-05-31', false),
  ('2025', '06', '2025-06-01', '2025-06-30', false),
  ('2025', '07', '2025-07-01', '2025-07-31', false),
  ('2025', '08', '2025-08-01', '2025-08-31', false),
  ('2025', '09', '2025-09-01', '2025-09-30', false),
  ('2025', '10', '2025-10-01', '2025-10-31', false),
  ('2025', '11', '2025-11-01', '2025-11-30', false),
  ('2025', '12', '2025-12-01', '2025-12-31', false)
ON CONFLICT (period_year, period_month) DO NOTHING;

-- i18n Messages — English
INSERT INTO i18n_messages (field_key, table_key, lang, message) VALUES
  ('close', 'COMMON', 'en', 'Close'),
  ('search', 'COMMON', 'en', 'Search'),
  ('save', 'COMMON', 'en', 'Save'),
  ('delete', 'COMMON', 'en', 'Delete'),
  ('edit', 'COMMON', 'en', 'Edit'),
  ('cancel', 'COMMON', 'en', 'Cancel'),
  ('confirm', 'COMMON', 'en', 'Confirm'),
  ('back', 'COMMON', 'en', 'Back'),
  ('next', 'COMMON', 'en', 'Next'),
  ('submit', 'COMMON', 'en', 'Submit'),
  ('approve', 'COMMON', 'en', 'Approve'),
  ('reject', 'COMMON', 'en', 'Reject'),
  ('total', 'COMMON', 'en', 'Total'),
  ('required', 'COMMON', 'en', 'This field is required'),
  ('save_success', 'COMMON', 'en', 'Saved successfully'),
  ('delete_success', 'COMMON', 'en', 'Deleted successfully'),
  ('no_data', 'COMMON', 'en', 'No data found')
ON CONFLICT DO NOTHING;

-- i18n Messages — Thai
INSERT INTO i18n_messages (field_key, table_key, lang, message) VALUES
  ('close', 'COMMON', 'th', 'ปิด'),
  ('search', 'COMMON', 'th', 'ค้นหา'),
  ('save', 'COMMON', 'th', 'บันทึก'),
  ('delete', 'COMMON', 'th', 'ลบ'),
  ('edit', 'COMMON', 'th', 'แก้ไข'),
  ('cancel', 'COMMON', 'th', 'ยกเลิก'),
  ('confirm', 'COMMON', 'th', 'ยืนยัน'),
  ('back', 'COMMON', 'th', 'ย้อนกลับ'),
  ('next', 'COMMON', 'th', 'ถัดไป'),
  ('submit', 'COMMON', 'th', 'ส่ง'),
  ('approve', 'COMMON', 'th', 'อนุมัติ'),
  ('reject', 'COMMON', 'th', 'ปฏิเสธ'),
  ('total', 'COMMON', 'th', 'รวม'),
  ('required', 'COMMON', 'th', 'กรุณากรอกข้อมูล'),
  ('save_success', 'COMMON', 'th', 'บันทึกสำเร็จ'),
  ('delete_success', 'COMMON', 'th', 'ลบสำเร็จ'),
  ('no_data', 'COMMON', 'th', 'ไม่พบข้อมูล')
ON CONFLICT DO NOTHING;