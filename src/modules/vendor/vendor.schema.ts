import { z } from "zod";

export const vendorSchema = z.object({
  code: z
    .string()
    .min(1, "Vendor code is required")
    .max(20, "Vendor code must be 20 characters or less"),
  name_en: z
    .string()
    .min(1, "Vendor name is required")
    .max(200, "Vendor name must be 200 characters or less"),
  name_th: z
    .string()
    .max(200, "Thai vendor name must be 200 characters or less")
    .nullable()
    .optional(),
  address_line1: z
    .string()
    .max(500, "Address line 1 must be 500 characters or less")
    .nullable()
    .optional(),
  address_line2: z
    .string()
    .max(500, "Address line 2 must be 500 characters or less")
    .nullable()
    .optional(),
  address_line3: z
    .string()
    .max(500, "Address line 3 must be 500 characters or less")
    .nullable()
    .optional(),
  address_line1_th: z
    .string()
    .max(500, "Thai address line 1 must be 500 characters or less")
    .nullable()
    .optional(),
  address_line2_th: z
    .string()
    .max(500, "Thai address line 2 must be 500 characters or less")
    .nullable()
    .optional(),
  address_line3_th: z
    .string()
    .max(500, "Thai address line 3 must be 500 characters or less")
    .nullable()
    .optional(),
  city: z
    .string()
    .max(100, "City must be 100 characters or less")
    .nullable()
    .optional(),
  country: z
    .string()
    .max(100, "Country must be 100 characters or less")
    .nullable()
    .optional(),
  city_th: z
    .string()
    .max(100, "Thai city must be 100 characters or less")
    .nullable()
    .optional(),
  country_th: z
    .string()
    .max(100, "Thai country must be 100 characters or less")
    .nullable()
    .optional(),
  zip_code: z
    .string()
    .max(10, "Zip code must be 10 characters or less")
    .nullable()
    .optional(),
  tel: z
    .string()
    .max(50, "Telephone must be 50 characters or less")
    .nullable()
    .optional(),
  fax: z
    .string()
    .max(50, "Fax must be 50 characters or less")
    .nullable()
    .optional(),
  email: z
    .string()
    .email("Invalid email format")
    .max(200, "Email must be 200 characters or less")
    .nullable()
    .optional()
    .or(z.literal("")),
  attn: z
    .string()
    .max(200, "Attention must be 200 characters or less")
    .nullable()
    .optional(),
  remark: z
    .string()
    .max(1000, "Remark must be 1000 characters or less")
    .nullable()
    .optional(),
  vendor_type: z
    .string()
    .max(20, "Vendor type must be 20 characters or less")
    .nullable()
    .optional(),
  ap_type_code: z
    .string()
    .max(20, "AP type code must be 20 characters or less")
    .nullable()
    .optional(),
  tax_id: z
    .string()
    .max(20, "Tax ID must be 20 characters or less")
    .nullable()
    .optional(),
  card_id: z
    .string()
    .max(20, "Card ID must be 20 characters or less")
    .nullable()
    .optional(),
  tax_percent: z
    .number()
    .min(0, "Tax percent must be 0 or greater")
    .max(1, "Tax percent must be 1 or less")
    .default(0),
  wht_percent: z
    .number()
    .min(0, "WHT percent must be 0 or greater")
    .max(1, "WHT percent must be 1 or less")
    .default(0),
  credit_term: z
    .number()
    .int()
    .min(0, "Credit term must be 0 or greater")
    .default(0),
  keep_po: z.boolean().default(false),
  transfer_ap: z.boolean().default(false),
  ac_trade: z
    .string()
    .max(20, "Trade account must be 20 characters or less")
    .nullable()
    .optional(),
  ac_deposit: z
    .string()
    .max(20, "Deposit account must be 20 characters or less")
    .nullable()
    .optional(),
  ac_po: z
    .string()
    .max(20, "PO account must be 20 characters or less")
    .nullable()
    .optional(),
  ac_add: z
    .string()
    .max(20, "Additional account must be 20 characters or less")
    .nullable()
    .optional(),
  wht_card_type: z
    .string()
    .max(20, "WHT card type must be 20 characters or less")
    .nullable()
    .optional(),
  wht_code: z
    .string()
    .max(20, "WHT code must be 20 characters or less")
    .nullable()
    .optional(),
  vat_code: z
    .string()
    .max(20, "VAT code must be 20 characters or less")
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
});

export const vendorUpdateSchema = vendorSchema
  .partial()
  .required({ code: true, name_en: true });

export const vendorSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  field: z
    .enum(["code", "name_en", "tax_id", "attn", "email", "tel"])
    .optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type VendorSchemaInput = z.infer<typeof vendorSchema>;
export type VendorUpdateSchemaInput = z.infer<typeof vendorUpdateSchema>;
export type VendorSearchSchemaInput = z.infer<typeof vendorSearchSchema>;