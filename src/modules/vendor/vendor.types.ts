export interface Vendor {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  address_line1_th: string | null;
  address_line2_th: string | null;
  address_line3_th: string | null;
  city: string | null;
  country: string | null;
  city_th: string | null;
  country_th: string | null;
  zip_code: string | null;
  tel: string | null;
  fax: string | null;
  email: string | null;
  attn: string | null;
  remark: string | null;
  vendor_type: string | null;
  ap_type_code: string | null;
  tax_id: string | null;
  card_id: string | null;
  tax_percent: number;
  wht_percent: number;
  credit_term: number;
  keep_po: boolean;
  transfer_ap: boolean;
  ac_trade: string | null;
  ac_deposit: string | null;
  ac_po: string | null;
  ac_add: string | null;
  wht_card_type: string | null;
  wht_code: string | null;
  vat_code: string | null;
  open_amount: number;
  open_payment: number;
  amt_01: number;
  amt_02: number;
  amt_03: number;
  amt_04: number;
  amt_05: number;
  amt_06: number;
  amt_07: number;
  amt_08: number;
  amt_09: number;
  amt_10: number;
  amt_11: number;
  amt_12: number;
  amt_13: number;
  amt_14: number;
  amt_15: number;
  pay_01: number;
  pay_02: number;
  pay_03: number;
  pay_04: number;
  pay_05: number;
  pay_06: number;
  pay_07: number;
  pay_08: number;
  pay_09: number;
  pay_10: number;
  pay_11: number;
  pay_12: number;
  pay_13: number;
  pay_14: number;
  pay_15: number;
  total_amount: number;
  total_payment: number;
  deposit_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorFormData {
  code: string;
  name_en: string;
  name_th?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  address_line1_th?: string | null;
  address_line2_th?: string | null;
  address_line3_th?: string | null;
  city?: string | null;
  country?: string | null;
  city_th?: string | null;
  country_th?: string | null;
  zip_code?: string | null;
  tel?: string | null;
  fax?: string | null;
  email?: string | null;
  attn?: string | null;
  remark?: string | null;
  vendor_type?: string | null;
  ap_type_code?: string | null;
  tax_id?: string | null;
  card_id?: string | null;
  tax_percent: number;
  wht_percent: number;
  credit_term: number;
  keep_po?: boolean;
  transfer_ap?: boolean;
  ac_trade?: string | null;
  ac_deposit?: string | null;
  ac_po?: string | null;
  ac_add?: string | null;
  wht_card_type?: string | null;
  wht_code?: string | null;
  vat_code?: string | null;
  is_active?: boolean;
}

export interface VendorMonthlyBalance {
  id: string;
  vendor_id: string;
  period_year: number;
  period_month: number;
  open_amount: number;
  open_dr: number;
  open_apply: number;
  open_paid: number;
  open_balance: number;
  inv_amount: number;
  dr_amount: number;
  apply_amount: number;
  paid_amount: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface VendorAging {
  vendor_id: string;
  code: string;
  name_en: string;
  current: number;
  overdue_1_30: number;
  overdue_31_60: number;
  overdue_61_90: number;
  overdue_91_plus: number;
  total_outstanding: number;
}

export interface VendorWithBalance extends Vendor {
  monthly_balance: VendorMonthlyBalance | null;
  outstanding_balance: number;
}

export interface VendorListParams {
  page?: number;
  pageSize?: number;
  sortBy?: keyof Vendor;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}

export interface VendorListResult {
  data: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VendorSearchParams {
  query: string;
  field?: keyof Vendor;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}