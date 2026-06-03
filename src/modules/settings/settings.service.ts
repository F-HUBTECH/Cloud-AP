import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, DuplicateError, AppError } from "@/lib/errors";

export interface ApType {
  id: string;
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ApTypeFormData {
  code: string;
  name: string;
}

export interface VatCode {
  id: string;
  code: string;
  rate: number;
  description: string | null;
  gl_account: string | null;
  created_at: string;
  updated_at: string;
}

export interface VatCodeFormData {
  code: string;
  rate: number;
  description?: string | null;
  gl_account?: string | null;
}

export interface WhtCode {
  id: string;
  code: string;
  rate: number;
  description: string | null;
  gl_account: string | null;
  assign_zero: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhtCodeFormData {
  code: string;
  rate: number;
  description?: string | null;
  gl_account?: string | null;
  assign_zero?: boolean;
}

export interface PaymentCode {
  id: string;
  code: string;
  description: string | null;
  gl_account: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentCodeFormData {
  code: string;
  description?: string | null;
  gl_account?: string | null;
}

export interface Period {
  id: string;
  period_year: number;
  period_month: number;
  date_from: string;
  date_to: string;
  closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  auth_uid: string | null;
  login_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  employee_id: string | null;
  language: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUserFormData {
  login_name: string;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  employee_id?: string | null;
  language?: string | null;
  is_active?: boolean;
}

export class SettingsService {
  async listApTypes(params?: { search?: string }): Promise<ApType[]> {
    const supabase = await createServerClient();
    let query = supabase.from("ap_types").select("*").order("code");

    if (params?.search) {
      query = query.or(
        `code.ilike.%${params.search}%,name.ilike.%${params.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch AP types: ${error.message}`, "SETTINGS_ERROR");
    return (data as ApType[]) ?? [];
  }

  async getApTypeById(id: string): Promise<ApType> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("ap_types")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundError("AP Type", id);
    return data as ApType;
  }

  async createApType(formData: ApTypeFormData): Promise<ApType> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("ap_types")
      .select("id")
      .eq("code", formData.code)
      .maybeSingle();
    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase
      .from("ap_types")
      .insert(formData)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code);
      throw new AppError(`Failed to create AP type: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as ApType;
  }

  async updateApType(id: string, formData: Partial<ApTypeFormData>): Promise<ApType> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("ap_types")
      .select("id, code")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("AP Type", id);

    if (formData.code && formData.code !== existing.code) {
      const { data: duplicate } = await supabase
        .from("ap_types")
        .select("id")
        .eq("code", formData.code)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) throw new DuplicateError("code", formData.code);
    }

    const { data, error } = await supabase
      .from("ap_types")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code ?? "");
      throw new AppError(`Failed to update AP type: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as ApType;
  }

  async deleteApType(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("ap_types")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("AP Type", id);

    const { error } = await supabase.from("ap_types").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete AP type: ${error.message}`, "SETTINGS_ERROR");
  }

  async listVatCodes(params?: { search?: string }): Promise<VatCode[]> {
    const supabase = await createServerClient();
    let query = supabase.from("vat_codes").select("*").order("code");

    if (params?.search) {
      query = query.or(
        `code.ilike.%${params.search}%,description.ilike.%${params.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch VAT codes: ${error.message}`, "SETTINGS_ERROR");
    return (data as VatCode[]) ?? [];
  }

  async createVatCode(formData: VatCodeFormData): Promise<VatCode> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("vat_codes")
      .select("id")
      .eq("code", formData.code)
      .maybeSingle();
    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase
      .from("vat_codes")
      .insert(formData)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code);
      throw new AppError(`Failed to create VAT code: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as VatCode;
  }

  async updateVatCode(id: string, formData: Partial<VatCodeFormData>): Promise<VatCode> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("vat_codes")
      .select("id, code")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("VAT Code", id);

    if (formData.code && formData.code !== existing.code) {
      const { data: duplicate } = await supabase
        .from("vat_codes")
        .select("id")
        .eq("code", formData.code)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) throw new DuplicateError("code", formData.code);
    }

    const { data, error } = await supabase
      .from("vat_codes")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code ?? "");
      throw new AppError(`Failed to update VAT code: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as VatCode;
  }

  async deleteVatCode(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("vat_codes")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("VAT Code", id);

    const { error } = await supabase.from("vat_codes").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete VAT code: ${error.message}`, "SETTINGS_ERROR");
  }

  async listWhtCodes(params?: { search?: string }): Promise<WhtCode[]> {
    const supabase = await createServerClient();
    let query = supabase.from("wht_codes").select("*").order("code");

    if (params?.search) {
      query = query.or(
        `code.ilike.%${params.search}%,description.ilike.%${params.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch WHT codes: ${error.message}`, "SETTINGS_ERROR");
    return (data as WhtCode[]) ?? [];
  }

  async createWhtCode(formData: WhtCodeFormData): Promise<WhtCode> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("wht_codes")
      .select("id")
      .eq("code", formData.code)
      .maybeSingle();
    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase
      .from("wht_codes")
      .insert(formData)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code);
      throw new AppError(`Failed to create WHT code: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as WhtCode;
  }

  async updateWhtCode(id: string, formData: Partial<WhtCodeFormData>): Promise<WhtCode> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("wht_codes")
      .select("id, code")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("WHT Code", id);

    if (formData.code && formData.code !== existing.code) {
      const { data: duplicate } = await supabase
        .from("wht_codes")
        .select("id")
        .eq("code", formData.code)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) throw new DuplicateError("code", formData.code);
    }

    const { data, error } = await supabase
      .from("wht_codes")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code ?? "");
      throw new AppError(`Failed to update WHT code: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as WhtCode;
  }

  async deleteWhtCode(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("wht_codes")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("WHT Code", id);

    const { error } = await supabase.from("wht_codes").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete WHT code: ${error.message}`, "SETTINGS_ERROR");
  }

  async listPaymentCodes(params?: { search?: string }): Promise<PaymentCode[]> {
    const supabase = await createServerClient();
    let query = supabase.from("payment_codes").select("*").order("code");

    if (params?.search) {
      query = query.or(
        `code.ilike.%${params.search}%,description.ilike.%${params.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch payment codes: ${error.message}`, "SETTINGS_ERROR");
    return (data as PaymentCode[]) ?? [];
  }

  async createPaymentCode(formData: PaymentCodeFormData): Promise<PaymentCode> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("payment_codes")
      .select("id")
      .eq("code", formData.code)
      .maybeSingle();
    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase
      .from("payment_codes")
      .insert(formData)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code);
      throw new AppError(`Failed to create payment code: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as PaymentCode;
  }

  async updatePaymentCode(id: string, formData: Partial<PaymentCodeFormData>): Promise<PaymentCode> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("payment_codes")
      .select("id, code")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("Payment Code", id);

    if (formData.code && formData.code !== existing.code) {
      const { data: duplicate } = await supabase
        .from("payment_codes")
        .select("id")
        .eq("code", formData.code)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) throw new DuplicateError("code", formData.code);
    }

    const { data, error } = await supabase
      .from("payment_codes")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code ?? "");
      throw new AppError(`Failed to update payment code: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as PaymentCode;
  }

  async deletePaymentCode(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("payment_codes")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("Payment Code", id);

    const { error } = await supabase.from("payment_codes").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete payment code: ${error.message}`, "SETTINGS_ERROR");
  }

  async listPeriods(params?: { year?: number }): Promise<Period[]> {
    const supabase = await createServerClient();
    let query = supabase.from("periods").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false });

    if (params?.year) {
      query = query.eq("period_year", params.year);
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch periods: ${error.message}`, "SETTINGS_ERROR");
    return (data as Period[]) ?? [];
  }

  async closePeriod(id: string): Promise<Period> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("periods")
      .select("id, closed")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("Period", id);

    const { data, error } = await supabase
      .from("periods")
      .update({ closed: true })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new AppError(`Failed to close period: ${error.message}`, "SETTINGS_ERROR");
    return data as Period;
  }

  async reopenPeriod(id: string): Promise<Period> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("periods")
      .select("id, closed")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("Period", id);

    const { data, error } = await supabase
      .from("periods")
      .update({ closed: false })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new AppError(`Failed to reopen period: ${error.message}`, "SETTINGS_ERROR");
    return data as Period;
  }

  async listUsers(params?: { search?: string; isActive?: boolean }): Promise<AppUser[]> {
    const supabase = await createServerClient();
    let query = supabase.from("app_users").select("*").order("login_name");

    if (params?.search) {
      query = query.or(
        `login_name.ilike.%${params.search}%,display_name.ilike.%${params.search}%,department.ilike.%${params.search}%`
      );
    }

    if (params?.isActive !== undefined) {
      query = query.eq("is_active", params.isActive);
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch users: ${error.message}`, "SETTINGS_ERROR");
    return (data as AppUser[]) ?? [];
  }

  async getUserById(id: string): Promise<AppUser> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundError("User", id);
    return data as AppUser;
  }

  async createUser(formData: AppUserFormData): Promise<AppUser> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("app_users")
      .select("id")
      .eq("login_name", formData.login_name)
      .maybeSingle();
    if (existing) throw new DuplicateError("login_name", formData.login_name);

    const { data, error } = await supabase
      .from("app_users")
      .insert(formData)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("login_name", formData.login_name);
      throw new AppError(`Failed to create user: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as AppUser;
  }

  async updateUser(id: string, formData: Partial<AppUserFormData>): Promise<AppUser> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("app_users")
      .select("id, login_name")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("User", id);

    if (formData.login_name && formData.login_name !== existing.login_name) {
      const { data: duplicate } = await supabase
        .from("app_users")
        .select("id")
        .eq("login_name", formData.login_name)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) throw new DuplicateError("login_name", formData.login_name);
    }

    const { data, error } = await supabase
      .from("app_users")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("login_name", formData.login_name ?? "");
      throw new AppError(`Failed to update user: ${error.message}`, "SETTINGS_ERROR");
    }
    return data as AppUser;
  }

  async deleteUser(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("app_users")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("User", id);

    const { error } = await supabase.from("app_users").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete user: ${error.message}`, "SETTINGS_ERROR");
  }

  async createGlAccount(formData: { code: string; name: string; level_no?: number; parent_code?: string | null; account_type?: string; is_active?: boolean }): Promise<Record<string, unknown>> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase.from("gl_accounts").select("id").eq("code", formData.code).maybeSingle();
    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase.from("gl_accounts").insert(formData).select().single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code);
      throw new AppError(`Failed to create GL account: ${error.message}`, "SETTINGS_ERROR");
    }
    return data;
  }

  async updateGlAccount(id: string, formData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase.from("gl_accounts").select("id, code").eq("id", id).maybeSingle();
    if (!existing) throw new NotFoundError("GL Account", id);

    const { data, error } = await supabase.from("gl_accounts").update(formData).eq("id", id).select().single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", (formData.code as string) ?? "");
      throw new AppError(`Failed to update GL account: ${error.message}`, "SETTINGS_ERROR");
    }
    return data;
  }

  async deleteGlAccount(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase.from("gl_accounts").select("id").eq("id", id).maybeSingle();
    if (!existing) throw new NotFoundError("GL Account", id);
    const { error } = await supabase.from("gl_accounts").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete GL account: ${error.message}`, "SETTINGS_ERROR");
  }

  async updateConfig(formData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase.from("config").select("id").limit(1);

    if (existing && existing.length > 0) {
      const { data, error } = await supabase.from("config").update(formData).eq("id", existing[0].id).select().single();
      if (error) throw new AppError(`Failed to update config: ${error.message}`, "SETTINGS_ERROR");
      return data;
    } else {
      const { data, error } = await supabase.from("config").insert(formData).select().single();
      if (error) throw new AppError(`Failed to create config: ${error.message}`, "SETTINGS_ERROR");
      return data;
    }
  }
}

export const settingsService = new SettingsService();