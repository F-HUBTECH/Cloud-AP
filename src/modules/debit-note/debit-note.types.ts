import type { VoucherStatus, VatMode } from "@/lib/constants";

export interface DebitNote {
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
  totalNoVat: number;
  totalVat: number;
  balance: number;
  paidAmount: number;
  periodMonth: string;
  periodYear: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebitNoteItem {
  id: string;
  invoiceId: string;
  lineNo: number;
  glAccount: string;
  description: string | null;
  debit: number;
  credit: number;
}

export interface DebitNoteFormData {
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
  totalNoVat?: number;
  totalVat?: number;
  balance?: number;
  periodMonth: string;
  periodYear: string;
  items: DebitNoteItemFormData[];
}

export interface DebitNoteItemFormData {
  glAccount: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface DebitNoteWithVendor extends DebitNote {
  supplier: {
    code: string;
    name: string;
    name_th: string | null;
    tax_id: string | null;
  };
  items: DebitNoteItem[];
}

export interface DebitNoteListParams {
  page?: number;
  pageSize?: number;
  supplierCode?: string;
  periodMonth?: string;
  periodYear?: string;
  status?: VoucherStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface DebitNoteListResult {
  data: DebitNote[];
  total: number;
  page: number;
  pageSize: number;
}