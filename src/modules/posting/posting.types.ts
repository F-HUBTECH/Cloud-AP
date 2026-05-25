import type { VoucherStatus, VatMode, TransactionType } from "@/lib/constants";

export interface Invoice {
  id: string;
  documentNumber: string;
  documentDate: string;
  supplierCode: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  amount: number;
  creditTerm: number;
  dueDate: string;
  remark: string | null;
  debit: number;
  credit: number;
  whtAmount: number;
  whtCode: string | null;
  vatType: VatMode;
  status: VoucherStatus;
  receiveNumber: string | null;
  vatNumber: string | null;
  poNumber: string | null;
  transactionType: TransactionType;
  totalNoVat: number;
  totalVat: number;
  balance: number;
  paidAmount: number;
  drAmount: number;
  periodMonth: string;
  periodYear: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  lineNo: number;
  glAccount: string;
  description: string | null;
  debit: number;
  credit: number;
}

export interface InvoiceFormData {
  documentNumber?: string;
  documentDate: string;
  supplierCode: string;
  supplierId?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  amount: number;
  creditTerm: number;
  dueDate: string;
  remark?: string;
  debit: number;
  credit: number;
  whtAmount?: number;
  whtCode?: string;
  vatType: VatMode;
  receiveNumber?: string;
  vatNumber?: string;
  poNumber?: string;
  transactionType: TransactionType;
  totalNoVat?: number;
  totalVat?: number;
  balance?: number;
  periodMonth: string;
  periodYear: string;
  items: InvoiceItemFormData[];
}

export interface InvoiceItemFormData {
  glAccount: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface InvoiceWithVendor extends Invoice {
  supplier: {
    code: string;
    name: string;
    name_th: string | null;
    tax_id: string | null;
  };
  items: InvoiceItem[];
}

export interface InvoiceOutstanding {
  id: string;
  documentNumber: string;
  documentDate: string;
  supplierCode: string;
  invoiceNumber: string;
  amount: number;
  debit: number;
  credit: number;
  whtAmount: number;
  balanceAmount: number;
  dueDate: string;
  creditTerm: number;
  status: VoucherStatus;
  supplierName: string;
}

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  supplierCode?: string;
  periodMonth?: string;
  periodYear?: string;
  status?: VoucherStatus;
  transactionType?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InvoiceListResult {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VendorBalanceSummary {
  supplierCode: string;
  supplierName: string;
  openingBalance: number;
  postingAmount: number;
  paymentAmount: number;
  closingBalance: number;
}