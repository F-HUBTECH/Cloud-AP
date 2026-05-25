export interface Transfer {
  id: string;
  doc_number: string;
  transfer_date: string;
  from_vendor_code: string;
  to_vendor_code: string;
  from_vendor_id: string;
  to_vendor_id: string;
  amount: number;
  remark: string | null;
  status: string;
  period_year: string | null;
  period_month: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface TransferWithVendors extends Transfer {
  from_vendor: { code: string; name_en: string; name_th: string | null } | null;
  to_vendor: { code: string; name_en: string; name_th: string | null } | null;
}

export interface TransferFormData {
  doc_date: string;
  from_vendor_id: string;
  to_vendor_id: string;
  amount: number;
  remark?: string;
}

export interface TransferListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransferListResult {
  data: TransferWithVendors[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}