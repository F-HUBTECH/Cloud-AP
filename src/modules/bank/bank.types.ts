export interface BankReconciliation {
  id: string;
  bankCode: string;
  bankName: string | null;
  statementDate: string | null;
  bookBalance: number;
  isReconciled: boolean;
  chequeDate: string | null;
  chequeNumber: string | null;
  remark: string | null;
  receivedDate: string | null;
  amount: number | null;
  supplierCode: string | null;
  status: string | null;
  cancelled: boolean;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChequeTransaction {
  id: string;
  paymentId: string | null;
  bankCode: string;
  bankName: string | null;
  chequeNumber: string;
  chequeDate: string;
  remark: string | null;
  cancelled: boolean;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankReconciliationFormData {
  bankCode: string;
  statementDate: string;
  bookBalance: number;
  status?: string;
  remark?: string;
  chequeDate?: string;
  chequeNumber?: string;
  amount?: number;
  supplierCode?: string;
  receivedDate?: string;
  cheques: ChequeTransactionFormData[];
}

export interface ChequeTransactionFormData {
  paymentId?: string;
  bankCode: string;
  bankName?: string;
  chequeNumber: string;
  chequeDate: string;
  remark?: string;
}

export interface BankReconciliationWithDetails extends BankReconciliation {
  cheques: ChequeTransaction[];
}

export interface BankReconciliationListParams {
  page?: number;
  pageSize?: number;
  bankCode?: string;
  isReconciled?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface BankReconciliationListResult {
  data: BankReconciliation[];
  total: number;
  page: number;
  pageSize: number;
}