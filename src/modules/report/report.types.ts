export interface APAgingItem {
  supplierCode: string;
  supplierName: string;
  currentAmount: number;
  overdue1To30: number;
  overdue31To60: number;
  overdue61To90: number;
  overdue91Plus: number;
  totalOutstanding: number;
}

export interface APAgingReport {
  asOfDate: string;
  items: APAgingItem[];
  totalCurrent: number;
  totalOverdue1To30: number;
  totalOverdue31To60: number;
  totalOverdue61To90: number;
  totalOverdue91Plus: number;
  grandTotal: number;
}

export interface VendorCardTransaction {
  documentNumber: string;
  documentDate: string;
  transactionType: string;
  invoiceNumber: string;
  debit: number;
  credit: number;
  balance: number;
  remark: string | null;
}

export interface VendorCardReport {
  supplierCode: string;
  supplierName: string;
  periodMonth: string;
  periodYear: string;
  openingBalance: number;
  transactions: VendorCardTransaction[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface DetailLedgerEntry {
  documentNumber: string;
  documentDate: string;
  accountNumber: string;
  accountName: string | null;
  supplierCode: string;
  supplierName: string;
  debit: number;
  credit: number;
  balance: number;
  remark: string | null;
  transactionType: string;
}

export interface DetailLedgerReport {
  accountNumber: string;
  accountName: string | null;
  periodMonth: string;
  periodYear: string;
  openingBalance: number;
  entries: DetailLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface DashboardStats {
  totalPayable: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  totalPendingApproval: number;
  totalDebitNotes: number;
  totalDeposits: number;
  outstandingInvoices: number;
  upcomingDueThisWeek: number;
  recentTransactions: RecentTransaction[];
}

export interface RecentTransaction {
  id: string;
  documentNumber: string;
  documentDate: string;
  supplierCode: string;
  supplierName: string;
  amount: number;
  transactionType: string;
  status: string;
}

export interface APAgingParams {
  asOfDate: string;
  supplierCode?: string;
}

export interface VendorCardParams {
  supplierCode: string;
  periodMonth: string;
  periodYear: string;
}

export interface DetailLedgerParams {
  accountNumber: string;
  periodMonth: string;
  periodYear: string;
  supplierCode?: string;
}

export interface PaymentRegisterItem {
  id: string;
  docNumber: string;
  docDate: string;
  supplierCode: string;
  supplierName: string;
  payMethod: string;
  chequeNumber: string | null;
  totalAmount: number;
  totalWht: number;
  totalVat: number;
  totalNet: number;
  status: string;
}

export interface PaymentRegisterReport {
  dateFrom: string;
  dateTo: string;
  items: PaymentRegisterItem[];
  totalAmount: number;
  totalWht: number;
  totalVat: number;
  totalNet: number;
}

export interface PaymentRegisterParams {
  dateFrom: string;
  dateTo: string;
  supplierCode?: string;
  status?: string;
}

export interface InvoiceRegisterItem {
  id: string;
  docNumber: string;
  docDate: string;
  supplierCode: string;
  supplierName: string;
  invNumber: string | null;
  apTypeCode: string | null;
  totalAmount: number;
  vatAmount: number;
  whtAmount: number;
  balance: number;
  status: string;
}

export interface InvoiceRegisterReport {
  dateFrom: string;
  dateTo: string;
  items: InvoiceRegisterItem[];
  totalAmount: number;
  totalVat: number;
  totalWht: number;
  totalBalance: number;
}

export interface InvoiceRegisterParams {
  dateFrom: string;
  dateTo: string;
  supplierCode?: string;
  apTypeCode?: string;
  status?: string;
}

export interface VendorBalanceItem {
  code: string;
  name_en: string;
  name_th: string | null;
  totalAmount: number;
  totalPayment: number;
  openAmount: number;
  balance: number;
}

export interface VendorBalanceReport {
  items: VendorBalanceItem[];
  totalAmount: number;
  totalPayment: number;
  totalOpenAmount: number;
  totalBalance: number;
}