export interface DepositPayment {
  id: string;
  docNumber: string;
  depositDate: string;
  supplierCode: string;
  supplierId: string | null;
  dueDate: string | null;
  amount: number;
  vatAmount: number;
  vatPercent: number;
  poNumber: string | null;
  remark: string | null;
  payCode: string | null;
  paidBy: string | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepositPaymentItem {
  id: string;
  depositId: string;
  lineNo: number;
  glAccount: string;
  description: string | null;
  drAmount: number;
  crAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepositFormData {
  docNumber?: string;
  depositDate: string;
  supplierCode: string;
  supplierId?: string;
  dueDate?: string;
  amount: number;
  vatAmount?: number;
  vatPercent?: number;
  poNumber?: string;
  remark?: string;
  payCode?: string;
  paidBy?: string;
  chequeNumber?: string;
  chequeDate?: string;
  items: DepositItemFormData[];
}

export interface DepositItemFormData {
  glAccount: string;
  description?: string;
  drAmount: number;
  crAmount: number;
}

export interface DepositWithVendor extends DepositPayment {
  vendor: {
    code: string;
    name_en: string;
    name_th: string | null;
    tax_id: string | null;
  } | null;
  items: DepositPaymentItem[];
}

export interface DepositListParams {
  page?: number;
  pageSize?: number;
  supplierCode?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface DepositListResult {
  data: DepositPayment[];
  total: number;
  page: number;
  pageSize: number;
}