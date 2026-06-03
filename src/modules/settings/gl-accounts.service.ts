import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, DuplicateError, AppError } from "@/lib/errors";

export interface GlAccount {
  id: string;
  code: string;
  name: string;
  level_no: number;
  parent_code: string | null;
  account_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GlAccountFormData {
  code: string;
  name: string;
  level_no?: number;
  parent_code?: string | null;
  account_type?: string;
  is_active?: boolean;
}

export class GlAccountsService {
  async list(params?: { search?: string }): Promise<GlAccount[]> {
    const supabase = await createServerClient();
    let query = supabase.from("gl_accounts").select("*").order("code");

    if (params?.search) {
      query = query.or(
        `code.ilike.%${params.search}%,name.ilike.%${params.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(`Failed to fetch GL accounts: ${error.message}`, "GL_ACCOUNTS_ERROR");
    return (data as GlAccount[]) ?? [];
  }

  async getById(id: string): Promise<GlAccount> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("gl_accounts")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundError("GL Account", id);
    return data as GlAccount;
  }

  async create(formData: GlAccountFormData): Promise<GlAccount> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("gl_accounts")
      .select("id")
      .eq("code", formData.code)
      .maybeSingle();
    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase
      .from("gl_accounts")
      .insert(formData)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code);
      throw new AppError(`Failed to create GL account: ${error.message}`, "GL_ACCOUNTS_ERROR");
    }
    return data as GlAccount;
  }

  async update(id: string, formData: Partial<GlAccountFormData>): Promise<GlAccount> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("gl_accounts")
      .select("id, code")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("GL Account", id);

    if (formData.code && formData.code !== existing.code) {
      const { data: duplicate } = await supabase
        .from("gl_accounts")
        .select("id")
        .eq("code", formData.code)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) throw new DuplicateError("code", formData.code);
    }

    const { data, error } = await supabase
      .from("gl_accounts")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicateError("code", formData.code ?? "");
      throw new AppError(`Failed to update GL account: ${error.message}`, "GL_ACCOUNTS_ERROR");
    }
    return data as GlAccount;
  }

  async delete(id: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("gl_accounts")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new NotFoundError("GL Account", id);

    const { error } = await supabase.from("gl_accounts").delete().eq("id", id);
    if (error) throw new AppError(`Failed to delete GL account: ${error.message}`, "GL_ACCOUNTS_ERROR");
  }
}

export const glAccountsService = new GlAccountsService();