import { z } from "zod";
import { APPROVAL_STATUS } from "@/lib/constants";

const approvalStatuses = [
  APPROVAL_STATUS.PENDING,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
] as const;

export const approvalFormDataSchema = z.object({
  entityType: z.enum(["voucher", "payment", "debit_note", "credit_note"], {
    required_error: "Entity type is required",
  }),
  entityId: z.string().uuid("Select a valid entity"),
  remarks: z.string().max(500).optional(),
});

export const approvalActionDataSchema = z.object({
  approvalId: z.string().uuid("Select a valid approval"),
  remarks: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional(),
}).refine(
  (data) => data.remarks || data.rejectionReason,
  { message: "Remarks or rejection reason is required", path: ["remarks"] }
);

export const approvalListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  entityType: z.enum(["voucher", "payment", "debit_note", "credit_note"]).optional(),
  status: z.enum(approvalStatuses).optional(),
  requestedBy: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type ApprovalFormDataInput = z.infer<typeof approvalFormDataSchema>;
export type ApprovalActionDataInput = z.infer<typeof approvalActionDataSchema>;
export type ApprovalListParamsInput = z.infer<typeof approvalListParamsSchema>;
