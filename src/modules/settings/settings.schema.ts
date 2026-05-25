import { z } from "zod";

export const apTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  name: z.string().min(1, "Name is required").max(200),
});

export const apTypeUpdateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(200),
});

export const vatCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  rate: z.number().min(0).max(1, "Rate must be between 0 and 1"),
  description: z.string().max(200).optional().nullable(),
  gl_account: z.string().max(20).optional().nullable(),
});

export const vatCodeUpdateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(10),
  rate: z.number().min(0).max(1),
  description: z.string().max(200).optional().nullable(),
  gl_account: z.string().max(20).optional().nullable(),
});

export const whtCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  rate: z.number().min(0, "Rate is required").max(1, "Rate must be between 0 and 1"),
  description: z.string().max(200).optional().nullable(),
  gl_account: z.string().max(20).optional().nullable(),
  assign_zero: z.boolean().optional().default(false),
});

export const whtCodeUpdateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(10),
  rate: z.number().min(0).max(1),
  description: z.string().max(200).optional().nullable(),
  gl_account: z.string().max(20).optional().nullable(),
  assign_zero: z.boolean().optional(),
});

export const paymentCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  description: z.string().max(200).optional().nullable(),
  gl_account: z.string().max(20).optional().nullable(),
});

export const paymentCodeUpdateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(10),
  description: z.string().max(200).optional().nullable(),
  gl_account: z.string().max(20).optional().nullable(),
});

export const glAccountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  level_no: z.number().int().min(1).default(1),
  parent_code: z.string().max(20).optional().nullable(),
  account_type: z.enum(["detail", "header", "subtotal"]).default("detail"),
  is_active: z.boolean().default(true),
});

export const glAccountUpdateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  level_no: z.number().int().min(1),
  parent_code: z.string().max(20).optional().nullable(),
  account_type: z.enum(["detail", "header", "subtotal"]),
  is_active: z.boolean(),
});

export const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const configSchema = z.object({
  company_code: z.string().max(20).optional().nullable(),
  company_name_en: z.string().max(200).optional().nullable(),
  company_name_th: z.string().max(200).optional().nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  address_line3: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  zip_code: z.string().max(20).optional().nullable(),
  tax_id: z.string().max(30).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  fax: z.string().max(30).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  reg_no: z.string().max(30).optional().nullable(),
  contact_person: z.string().max(200).optional().nullable(),
  vat_percent: z.number().min(0).max(100).optional().nullable(),
  wht_percent: z.number().min(0).max(100).optional().nullable(),
  default_lang: z.string().max(10).optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  auto_doc_no: z.boolean().optional().nullable(),
  vc_auto: z.boolean().optional().nullable(),
  vc_format1: z.string().max(10).optional().nullable(),
  vc_format2: z.string().max(10).optional().nullable(),
  vc_fix_for: z.number().int().optional().nullable(),
  vc_for_len: z.number().int().optional().nullable(),
  dr_auto: z.boolean().optional().nullable(),
  dr_format1: z.string().max(10).optional().nullable(),
  dr_format2: z.string().max(10).optional().nullable(),
  dr_fix_for: z.number().int().optional().nullable(),
  dr_for_len: z.number().int().optional().nullable(),
  pd_auto: z.boolean().optional().nullable(),
  pd_format1: z.string().max(10).optional().nullable(),
  pd_format2: z.string().max(10).optional().nullable(),
  pd_fix_for: z.number().int().optional().nullable(),
  pd_for_len: z.number().int().optional().nullable(),
  dp_auto: z.boolean().optional().nullable(),
  dp_format1: z.string().max(10).optional().nullable(),
  dp_format2: z.string().max(10).optional().nullable(),
  dp_fix_for: z.number().int().optional().nullable(),
  dp_for_len: z.number().int().optional().nullable(),
  chk_vc_dup: z.boolean().optional().nullable(),
  chk_vc_empty: z.boolean().optional().nullable(),
  chk_inv_dup: z.boolean().optional().nullable(),
  chk_inv_empty: z.boolean().optional().nullable(),
  chk_ac_date: z.boolean().optional().nullable(),
  chk_upd_over: z.boolean().optional().nullable(),
  chk_ac_trade: z.boolean().optional().nullable(),
  chk_ac_tax: z.boolean().optional().nullable(),
  chk_send_gl: z.boolean().optional().nullable(),
  chk_gl_mn: z.boolean().optional().nullable(),
  gen_wht: z.boolean().optional().nullable(),
  prn_wht: z.boolean().optional().nullable(),
  print_payment: z.boolean().optional().nullable(),
  chk_cheque_no: z.boolean().optional().nullable(),
  import_inv: z.boolean().optional().nullable(),
  print_voucher: z.boolean().optional().nullable(),
  tax_assign_inv: z.boolean().optional().nullable(),
  acc_trade: z.string().max(20).optional().nullable(),
  acc_deposit: z.string().max(20).optional().nullable(),
  acc_po: z.string().max(20).optional().nullable(),
  acc_add: z.string().max(20).optional().nullable(),
});