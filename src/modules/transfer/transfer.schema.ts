import { z } from "zod";

export const transferCreateSchema = z.object({
  doc_date: z.string().date("Select a valid transfer date"),
  source_invoice_id: z.string().uuid("Select a source AP voucher"),
  to_vendor_id: z.string().uuid("Select a destination vendor"),
  remark: z.string().trim().min(1, "Transfer reason is required").max(500),
});

export type TransferCreateInput = z.infer<typeof transferCreateSchema>;
