import { z } from "zod";

export const depositApplicationCreateSchema = z.object({
  depositId: z.string().uuid("Select a valid deposit"),
  applications: z.array(
    z.object({
      invoiceId: z.string().uuid("Select a valid invoice"),
      amountApplied: z.number().positive("Applied amount must be greater than zero"),
      vatApplied: z.number().min(0).default(0),
    })
  ).min(1, "At least one application is required"),
});

export const depositApplicationCancelSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Cancel reason is required"),
});

export const depositApplicationSearchSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  supplierCode: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type DepositApplicationCreateInput = z.infer<typeof depositApplicationCreateSchema>;
export type DepositApplicationCancelInput = z.infer<typeof depositApplicationCancelSchema>;
export type DepositApplicationSearchInput = z.infer<typeof depositApplicationSearchSchema>;
