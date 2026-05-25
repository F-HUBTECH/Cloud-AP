export interface Payment {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string | null;
  pay_method: string;
  pay_code: string | null;
  bank_code: string | null;
  bank_name: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  remark: string | null;
  currency: string;
  total_amount: number;
  total_wht: number;
  total_vat: number;
  total_net: number;
  deposit_amount: number;
  deposit_vat: number;
  status: string;
  period_year: string | null;
  period_month: string | null;
  gl_jv_number: string | null;
  paid_at: string | null;
  paid_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface PaymentItem {
  id: string;
  payment_id: string;
  line_no: number;
  gl_account: string | null;
  description: string | null;
  dr_amount: number;
  cr_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentInvoice {
  id: string;
  payment_id: string;
  invoice_id: string;
  voucher_number: string;
  amount_paid: number;
  wht_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentFormData {
  doc_date: string;
  supplier_code: string;
  supplier_id?: string;
  pay_method: string;
  pay_code?: string;
  bank_code?: string;
  bank_name?: string;
  cheque_number?: string;
  cheque_date?: string;
  remark?: string;
  total_amount?: number;
  total_wht?: number;
  total_vat?: number;
  total_net?: number;
  deposit_amount?: number;
  deposit_vat?: number;
  period_year?: string;
  period_month?: string;
  items: PaymentItemFormData[];
  invoices: PaymentInvoiceFormData[];
}

export interface PaymentItemFormData {
  gl_account?: string;
  description?: string;
  dr_amount: number;
  cr_amount: number;
}

export interface PaymentInvoiceFormData {
  invoice_id: string;
  voucher_number?: string;
  amount_paid?: number;
  wht_amount?: number;
}

export interface PaymentWithVendor extends Payment {
  vendor: {
    code: string;
    name_en: string;
    name_th: string | null;
    tax_id: string | null;
  };
  items: PaymentItem[];
  invoices: PaymentInvoice[];
}

export interface WithholdingTax {
  id: string;
  payment_id: string;
  doc_number: string | null;
  wht_code: string;
  wht_rate: number;
  base_amount: number;
  tax_amount: number;
  wht_type: number | null;
  condition_pay: number | null;
  remark: string | null;
  doc_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhtPerSupplier {
  id: string;
  supplier_code: string;
  doc_number: string | null;
  wht_code: string | null;
  wht_rate: number;
  base_amount: number;
  tax_amount: number;
  wht_type: number | null;
  condition_pay: number | null;
  is_cancelled: boolean;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  remark: string | null;
  wht_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutstandingInvoice {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  inv_number: string;
  amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  credit_term: number | null;
  status: string;
  supplier_name: string;
}

export interface PaymentListParams {
  page?: number;
  pageSize?: number;
  supplierCode?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
}

export interface PaymentListResult {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
}