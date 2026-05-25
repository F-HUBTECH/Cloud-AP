import { z } from "zod";
import { VOUCHER_STATUS, TRANSACTION_TYPES, VAT_MODES } from "@/lib/constants";

export const postingDetailSchema = z.object({
  glAccount: z.string().min(1, "GL account is required"),
  description: z.string().max(100).optional().default(""),
  debit: z.number().min(0, "Debit must be non-negative").default(0),
  credit: z.number().min(0, "Credit must be non-negative").default(0),
}).refine(
  (data) => data.debit > 0 || data.credit > 0,
  { message: "Either debit or credit must be greater than zero", path: ["debit"] }
);

export const postingHeaderSchema = z.object({
  documentNumber: z.string().min(1, "Document number is required").max(20).optional(),
  documentDate: z.string().min(1, "Document date is required"),
  supplierCode: z.string().min(1, "Supplier code is required").max(5),
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required").max(20),
  invoiceDate: z.string().optional().default(""),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  creditTerm: z.number().int().min(0, "Credit term must be non-negative").default(0),
  dueDate: z.string().min(1, "Due date is required"),
  remark: z.string().max(100).optional().default(""),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  whtAmount: z.number().min(0).default(0),
  whtCode: z.string().max(2).optional().default(""),
  vatType: z.enum([
    VAT_MODES.INCLUSIVE,
    VAT_MODES.EXCLUSIVE,
    VAT_MODES.EXEMPT,
    VAT_MODES.NONE,
  ] as [string, ...string[]]).default(VAT_MODES.NONE),
  receiveNumber: z.string().max(20).optional().default(""),
  vatNumber: z.string().max(15).optional().default(""),
  poNumber: z.string().max(20).optional().default(""),
  transactionType: z.enum([
    TRANSACTION_TYPES.AP_VOUCHER,
    TRANSACTION_TYPES.AP_CREDIT_NOTE,
    TRANSACTION_TYPES.AP_DEBIT_NOTE,
    TRANSACTION_TYPES.AP_PAYMENT,
    TRANSACTION_TYPES.AP_ADVANCE,
  ] as [string, ...string[]]).default(TRANSACTION_TYPES.AP_VOUCHER),
  totalNoVat: z.number().min(0).default(0),
  totalVat: z.number().min(0).default(0),
  balance: z.number().min(0).default(0),
  periodMonth: z.string().min(1, "Period month is required"),
  periodYear: z.string().min(1, "Period year is required"),
  items: z.array(postingDetailSchema).min(1, "At least one line item is required"),
}).refine(
  (data) => {
    const debitTotal = data.items.reduce((sum, item) => sum + item.debit, 0);
    const creditTotal = data.items.reduce((sum, item) => sum + item.credit, 0);
    return Math.abs(debitTotal - creditTotal) < 0.01;
  },
  { message: "Total debit must equal total credit", path: ["items"] }
);

export const postingSearchSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  supplierCode: z.string().optional(),
  periodMonth: z.string().optional(),
  periodYear: z.string().optional(),
  status: z.enum([
    VOUCHER_STATUS.DRAFT,
    VOUCHER_STATUS.PENDING_APPROVAL,
    VOUCHER_STATUS.APPROVED,
    VOUCHER_STATUS.REJECTED,
    VOUCHER_STATUS.POSTED,
    VOUCHER_STATUS.CANCELLED,
    VOUCHER_STATUS.VOIDED,
  ] as [string, ...string[]]).optional(),
  transactionType: z.enum([
    TRANSACTION_TYPES.AP_VOUCHER,
    TRANSACTION_TYPES.AP_CREDIT_NOTE,
    TRANSACTION_TYPES.AP_DEBIT_NOTE,
    TRANSACTION_TYPES.AP_PAYMENT,
    TRANSACTION_TYPES.AP_ADVANCE,
  ] as [string, ...string[]]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type PostingHeaderFormData = z.infer<typeof postingHeaderSchema>;
export type PostingDetailFormData = z.infer<typeof postingDetailSchema>;
export type PostingSearchParams = z.infer<typeof postingSearchSchema>;