import { z } from "zod";

export const transferCreateSchema = z.object({
  doc_date: z.string().min(1, "Transfer date is required"),
  from_vendor_id: z.string().uuid("Select a source vendor"),
  to_vendor_id: z.string().uuid("Select a destination vendor"),
  amount: z.number().positive("Amount must be greater than zero"),
  remark: z.string().max(500, "Remark must be 500 characters or less").optional(),
}).refine((data) => data.from_vendor_id !== data.to_vendor_id, {
  message: "Source and destination vendor cannot be the same",
  path: ["to_vendor_id"],
});

export type TransferCreateInput = z.infer<typeof transferCreateSchema>;