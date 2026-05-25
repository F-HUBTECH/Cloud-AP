import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";

export interface Config {
  id: string;
  company_code: string | null;
  company_name_en: string | null;
  company_name_th: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  city: string | null;
  country: string | null;
  zip_code: string | null;
  tax_id: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  reg_no: string | null;
  contact_person: string | null;
  vat_percent: number | null;
  wht_percent: number | null;
  default_lang: string | null;
  currency: string | null;
  auto_doc_no: boolean | null;
  vc_auto: boolean | null;
  vc_format1: string | null;
  vc_format2: string | null;
  vc_fix_for: number | null;
  vc_for_len: number | null;
  dr_auto: boolean | null;
  dr_format1: string | null;
  dr_format2: string | null;
  dr_fix_for: number | null;
  dr_for_len: number | null;
  pd_auto: boolean | null;
  pd_format1: string | null;
  pd_format2: string | null;
  pd_fix_for: number | null;
  pd_for_len: number | null;
  dp_auto: boolean | null;
  dp_format1: string | null;
  dp_format2: string | null;
  dp_fix_for: number | null;
  dp_for_len: number | null;
  chk_vc_dup: boolean | null;
  chk_vc_empty: boolean | null;
  chk_inv_dup: boolean | null;
  chk_inv_empty: boolean | null;
  chk_ac_date: boolean | null;
  chk_upd_over: boolean | null;
  chk_ac_trade: boolean | null;
  chk_ac_tax: boolean | null;
  chk_send_gl: boolean | null;
  chk_gl_mn: boolean | null;
  gen_wht: boolean | null;
  prn_wht: boolean | null;
  print_payment: boolean | null;
  chk_cheque_no: boolean | null;
  import_inv: boolean | null;
  print_voucher: boolean | null;
  tax_assign_inv: boolean | null;
  acc_trade: string | null;
  acc_deposit: string | null;
  acc_po: string | null;
  acc_add: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfigFormData {
  company_code?: string | null;
  company_name_en?: string | null;
  company_name_th?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  city?: string | null;
  country?: string | null;
  zip_code?: string | null;
  tax_id?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  reg_no?: string | null;
  contact_person?: string | null;
  vat_percent?: number | null;
  wht_percent?: number | null;
  default_lang?: string | null;
  currency?: string | null;
  auto_doc_no?: boolean | null;
  vc_auto?: boolean | null;
  vc_format1?: string | null;
  vc_format2?: string | null;
  vc_fix_for?: number | null;
  vc_for_len?: number | null;
  dr_auto?: boolean | null;
  dr_format1?: string | null;
  dr_format2?: string | null;
  dr_fix_for?: number | null;
  dr_for_len?: number | null;
  pd_auto?: boolean | null;
  pd_format1?: string | null;
  pd_format2?: string | null;
  pd_fix_for?: number | null;
  pd_for_len?: number | null;
  dp_auto?: boolean | null;
  dp_format1?: string | null;
  dp_format2?: string | null;
  dp_fix_for?: number | null;
  dp_for_len?: number | null;
  chk_vc_dup?: boolean | null;
  chk_vc_empty?: boolean | null;
  chk_inv_dup?: boolean | null;
  chk_inv_empty?: boolean | null;
  chk_ac_date?: boolean | null;
  chk_upd_over?: boolean | null;
  chk_ac_trade?: boolean | null;
  chk_ac_tax?: boolean | null;
  chk_send_gl?: boolean | null;
  chk_gl_mn?: boolean | null;
  gen_wht?: boolean | null;
  prn_wht?: boolean | null;
  print_payment?: boolean | null;
  chk_cheque_no?: boolean | null;
  import_inv?: boolean | null;
  print_voucher?: boolean | null;
  tax_assign_inv?: boolean | null;
  acc_trade?: string | null;
  acc_deposit?: string | null;
  acc_po?: string | null;
  acc_add?: string | null;
}

export class ConfigService {
  async getConfig(): Promise<Config> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("config")
      .select("*")
      .limit(1)
      .single();

    if (error || !data) {
      throw new NotFoundError("Config");
    }
    return data as Config;
  }

  async updateConfig(formData: ConfigFormData): Promise<Config> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("config")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!existing) throw new NotFoundError("Config");

    const { data, error } = await supabase
      .from("config")
      .update(formData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update config: ${error.message}`, "CONFIG_UPDATE_ERROR", 500);
    }
    return data as Config;
  }
}

export const configService = new ConfigService();