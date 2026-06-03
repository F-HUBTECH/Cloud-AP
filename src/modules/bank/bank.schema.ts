import { z } from "zod";

export const chequeTransactionSchema = z.object({
  paymentId: z.string().uuid().optional(),
  bankCode: z.string().min(1, "Bank code is required"),
  bankName: z.string().max(200).optional().default(""),
  chequeNumber: z.string().min(1, "Cheque number is required").max(50),
  chequeDate: z.string().min(1, "Cheque date is required"),
  remark: z.string().max(200).optional().default(""),
});

export const bankReconciliationCreateSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required"),
  statementDate: z.string().min(1, "Statement date is required"),
  bookBalance: z.number().min(0, "Book balance must be non-negative"),
  status: z.string().optional().default(""),
  remark: z.string().max(200).optional().default(""),
  chequeDate: z.string().optional().default(""),
  chequeNumber: z.string().max(50).optional().default(""),
  amount: z.number().min(0).optional(),
  supplierCode: z.string().max(5).optional().default(""),
  receivedDate: z.string().optional().default(""),
  cheques: z.array(chequeTransactionSchema).default([]),
});

export const bankReconciliationCancelSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Cancel reason is required"),
});

export const bankReconciliationReconcileSchema = z.object({
  id: z.string().uuid(),
});

export const bankReconciliationSearchSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  bankCode: z.string().optional(),
  isReconciled: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type BankReconciliationCreateInput = z.infer<typeof bankReconciliationCreateSchema>;
export type ChequeTransactionInput = z.infer<typeof chequeTransactionSchema>;
export type BankReconciliationCancelInput = z.infer<typeof bankReconciliationCancelSchema>;
export type BankReconciliationReconcileInput = z.infer<typeof bankReconciliationReconcileSchema>;
export type BankReconciliationSearchInput = z.infer<typeof bankReconciliationSearchSchema>;
