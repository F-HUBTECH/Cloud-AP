import { z } from "zod";
import { VOUCHER_STATUS, VAT_MODES } from "@/lib/constants";

const vatModes = [VAT_MODES.INCLUSIVE, VAT_MODES.EXCLUSIVE, VAT_MODES.EXEMPT, VAT_MODES.NONE] as const;
const voucherStatuses = [
  VOUCHER_STATUS.DRAFT,
  VOUCHER_STATUS.PENDING_APPROVAL,
  VOUCHER_STATUS.APPROVED,
  VOUCHER_STATUS.REJECTED,
  VOUCHER_STATUS.POSTED,
  VOUCHER_STATUS.CANCELLED,
  VOUCHER_STATUS.VOIDED,
] as const;

export const debitNoteItemSchema = z.object({
  glAccount: z.string().min(1, "GL account is required"),
  description: z.string().max(100).optional().default(""),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
}).refine(
  (data) => data.debit > 0 || data.credit > 0,
  { message: "Either debit or credit must be greater than zero", path: ["debit"] }
);

export const debitNoteCreateSchema = z.object({
  documentNumber: z.string().min(1).max(20).optional(),
  documentDate: z.string().min(1, "Document date is required"),
  supplierCode: z.string().min(1, "Supplier code is required").max(5),
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required").max(20),
  invoiceDate: z.string().optional().default(""),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  creditTerm: z.number().int().min(0).default(0),
  dueDate: z.string().min(1, "Due date is required"),
  remark: z.string().max(100).optional().default(""),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  whtAmount: z.number().min(0).default(0),
  whtCode: z.string().max(2).optional().default(""),
  vatType: z.enum(vatModes).default(VAT_MODES.NONE),
  receiveNumber: z.string().max(20).optional().default(""),
  vatNumber: z.string().max(15).optional().default(""),
  poNumber: z.string().max(20).optional().default(""),
  totalNoVat: z.number().min(0).default(0),
  totalVat: z.number().min(0).default(0),
  balance: z.number().min(0).default(0),
  periodMonth: z.string().min(1, "Period month is required"),
  periodYear: z.string().min(1, "Period year is required"),
  items: z.array(debitNoteItemSchema).min(1, "At least one line item is required"),
});

export const debitNoteCancelSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Cancel reason is required"),
});

export const debitNoteDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const debitNoteSearchSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  supplierCode: z.string().optional(),
  periodMonth: z.string().optional(),
  periodYear: z.string().optional(),
  status: z.enum(voucherStatuses).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type DebitNoteCreateInput = z.infer<typeof debitNoteCreateSchema>;
export type DebitNoteItemInput = z.infer<typeof debitNoteItemSchema>;
export type DebitNoteCancelInput = z.infer<typeof debitNoteCancelSchema>;
export type DebitNoteDeleteInput = z.infer<typeof debitNoteDeleteSchema>;
export type DebitNoteSearchInput = z.infer<typeof debitNoteSearchSchema>;
