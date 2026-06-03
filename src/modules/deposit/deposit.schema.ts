import { z } from "zod";

export const depositItemSchema = z.object({
  glAccount: z.string().min(1, "GL account is required"),
  description: z.string().max(100).optional().default(""),
  drAmount: z.number().min(0).default(0),
  crAmount: z.number().min(0).default(0),
}).refine(
  (data) => data.drAmount > 0 || data.crAmount > 0,
  { message: "Either debit or credit amount must be greater than zero", path: ["drAmount"] }
);

export const depositCreateSchema = z.object({
  docNumber: z.string().min(1).max(20).optional(),
  depositDate: z.string().min(1, "Deposit date is required"),
  supplierCode: z.string().min(1, "Supplier code is required").max(5),
  supplierId: z.string().uuid().optional(),
  dueDate: z.string().optional().default(""),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  vatAmount: z.number().min(0).default(0),
  vatPercent: z.number().min(0).max(1).default(0),
  poNumber: z.string().max(20).optional().default(""),
  remark: z.string().max(100).optional().default(""),
  payCode: z.string().max(10).optional().default(""),
  paidBy: z.string().max(100).optional().default(""),
  chequeNumber: z.string().max(50).optional().default(""),
  chequeDate: z.string().optional().default(""),
  items: z.array(depositItemSchema).min(1, "At least one line item is required"),
});

export const depositCancelSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Cancel reason is required"),
});

export const depositDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const depositSearchSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  supplierCode: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type DepositCreateInput = z.infer<typeof depositCreateSchema>;
export type DepositItemInput = z.infer<typeof depositItemSchema>;
export type DepositCancelInput = z.infer<typeof depositCancelSchema>;
export type DepositDeleteInput = z.infer<typeof depositDeleteSchema>;
export type DepositSearchInput = z.infer<typeof depositSearchSchema>;
