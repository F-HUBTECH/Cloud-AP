import { z } from "zod";

export const createPaymentSchema = z.object({
  doc_date: z.string().min(1, "Document date is required"),
  supplier_code: z.string().min(1, "Supplier code is required").max(20),
  supplier_id: z.string().uuid().optional(),
  pay_method: z.enum(["cash", "cheque", "bank_transfer", "credit_card", "offset", "deposit"]),
  pay_code: z.string().max(5).optional().default(""),
  bank_code: z.string().max(10).optional().default(""),
  bank_name: z.string().max(60).optional().default(""),
  cheque_number: z.string().max(30).optional().default(""),
  cheque_date: z.string().optional().default(""),
  remark: z.string().max(500).optional().default(""),
  total_wht: z.number().min(0).default(0),
  total_vat: z.number().min(0).default(0),
  deposit_amount: z.number().min(0).default(0),
  deposit_vat: z.number().min(0).default(0),
  period_year: z.string().max(4).optional(),
  period_month: z.string().max(2).optional(),
  items: z
    .array(
      z.object({
        gl_account: z.string().max(20).optional().default(""),
        description: z.string().max(200).optional().default(""),
        dr_amount: z.number().min(0).default(0),
        cr_amount: z.number().min(0).default(0),
      }),
    )
    .min(1, "At least one item is required"),
  invoices: z
    .array(
      z.object({
        invoice_id: z.string().uuid(),
        voucher_number: z.string().max(30).optional().default(""),
        amount_paid: z.number().min(0).default(0),
        wht_amount: z.number().min(0).default(0),
      }),
    )
    .min(1, "At least one invoice is required"),
}).refine(
  (data) => {
    const totalDebit = data.items.reduce((sum, item) => sum + item.dr_amount, 0);
    const totalCredit = data.items.reduce((sum, item) => sum + item.cr_amount, 0);
    return totalCredit > 0 || totalDebit > 0;
  },
  { message: "Payment must have debit or credit amount", path: ["items"] },
);

export const paymentItemSchema = z.object({
  id: z.string().uuid(),
  payment_id: z.string().uuid(),
  line_no: z.number().int().positive(),
  gl_account: z.string().max(20).optional(),
  description: z.string().max(200).optional(),
  dr_amount: z.number().min(0).default(0),
  cr_amount: z.number().min(0).default(0),
});

export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;
export type PaymentItemFormData = z.infer<typeof paymentItemSchema>;