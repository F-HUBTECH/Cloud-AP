export interface DepositApplication {
  id: string;
  depositId: string;
  invoiceId: string;
  amountApplied: number;
  vatApplied: number;
  appliedBy: string | null;
  appliedAt: string;
  status: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepositApplicationWithDetails extends DepositApplication {
  depositDocNumber: string;
  depositDate: string;
  depositAmount: number;
  invoiceDocNumber: string;
  invoiceDate: string;
  invoiceBalance: number;
  vendorCode: string;
  vendorName: string;
}

export interface AvailableDeposit {
  id: string;
  docNumber: string;
  depositDate: string;
  amount: number;
  vatAmount: number;
  appliedAmount: number;
  remainingAmount: number;
  supplierCode: string;
  supplierId: string;
  status: string;
}

export interface AvailableInvoice {
  id: string;
  docNumber: string;
  docDate: string;
  invNumber: string | null;
  totalAmount: number;
  balance: number;
  supplierCode: string;
  apTypeCode: string | null;
}

export interface DepositApplicationFormData {
  depositId: string;
  applications: {
    invoiceId: string;
    amountApplied: number;
    vatApplied?: number;
  }[];
}

export interface DepositApplicationListParams {
  page?: number;
  pageSize?: number;
  supplierCode?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DepositApplicationListResult {
  data: DepositApplicationWithDetails[];
  total: number;
  page: number;
  pageSize: number;
}