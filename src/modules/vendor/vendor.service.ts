import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, DuplicateError, AppError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type {
  Vendor,
  VendorFormData,
  VendorMonthlyBalance,
  VendorListParams,
  VendorListResult,
  VendorSearchParams,
} from "./vendor.types";

export class VendorService {
  async list(params: VendorListParams = {}): Promise<VendorListResult> {
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sortBy = "code",
      sortOrder = "asc",
      search,
      isActive,
    } = params;

    const supabase = await createServerClient();

    let query = supabase
      .from("vendors")
      .select("*", { count: "exact" })
      .order(sortBy as string, { ascending: sortOrder === "asc" })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(
        `code.ilike.%${search}%,name_en.ilike.%${search}%,tax_id.ilike.%${search}%`,
      );
    }

    if (isActive !== undefined) {
      query = query.eq("is_active", isActive);
    }

    const { data, count, error } = await query;

    if (error) throw new AppError(`Failed to fetch vendors: ${error.message}`, "VENDOR_ERROR");

    return {
      data: (data as Vendor[]) ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  }

  async getById(id: string): Promise<Vendor> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Vendor", id);

    return data as Vendor;
  }

  async create(formData: VendorFormData): Promise<Vendor> {
    const supabase = await createServerClient();

    const { data: existing } = await supabase
      .from("vendors")
      .select("id")
      .eq("code", formData.code)
      .maybeSingle();

    if (existing) throw new DuplicateError("code", formData.code);

    const { data, error } = await supabase
      .from("vendors")
      .insert(formData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new DuplicateError("code", formData.code);
      }
      if (error.code === "42501") {
        throw new AppError(
          "Permission denied: Your account does not have a role that allows creating vendors. Contact an administrator to assign you a role (ADMIN, AP_USER, or AP_MANAGER).",
          "RLS_VIOLATION",
          403
        );
      }
      throw new AppError(`Failed to create vendor: ${error.message}`, "VENDOR_ERROR");
    }

    return data as Vendor;
  }

  async update(id: string, formData: Partial<VendorFormData>): Promise<Vendor> {
    const supabase = await createServerClient();

    const { data: existing } = await supabase
      .from("vendors")
      .select("id, code")
      .eq("id", id)
      .maybeSingle();

    if (!existing) throw new NotFoundError("Vendor", id);

    if (formData.code && formData.code !== existing.code) {
      const { data: duplicate } = await supabase
        .from("vendors")
        .select("id")
        .eq("code", formData.code)
        .neq("id", id)
        .maybeSingle();

      if (duplicate) throw new DuplicateError("code", formData.code);
    }

    const { data, error } = await supabase
      .from("vendors")
      .update(formData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new DuplicateError("code", formData.code ?? "");
      }
      throw new AppError(`Failed to update vendor: ${error.message}`, "VENDOR_ERROR");
    }

    return data as Vendor;
  }

  async delete(id: string): Promise<void> {
    const supabase = await createServerClient();

    const { data: existing } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) throw new NotFoundError("Vendor", id);

    const { error } = await supabase.from("vendors").delete().eq("id", id);

    if (error) throw new AppError(`Failed to delete vendor: ${error.message}`, "VENDOR_ERROR");
  }

  async search(params: VendorSearchParams): Promise<VendorListResult> {
    const {
      query: searchQuery,
      field,
      isActive,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    } = params;

    const supabase = await createServerClient();

    let query = supabase
      .from("vendors")
      .select("*", { count: "exact" });

    if (field) {
      query = query.ilike(field as string, `%${searchQuery}%`);
    } else {
      query = query.or(
        `code.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%,tax_id.ilike.%${searchQuery}%,attn.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`,
      );
    }

    if (isActive !== undefined) {
      query = query.eq("is_active", isActive);
    }

    query = query
      .order("code", { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) throw new AppError(`Failed to search vendors: ${error.message}`, "VENDOR_ERROR");

    return {
      data: (data as Vendor[]) ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  }

  async updateBalance(
    vendorId: string,
    periodMonth: number,
    periodYear: number,
    debitAmount: number = 0,
    creditAmount: number = 0,
  ): Promise<VendorMonthlyBalance> {
    const supabase = await createServerClient();

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", vendorId)
      .maybeSingle();

    if (!vendor) throw new NotFoundError("Vendor", vendorId);

    const { data: existing } = await supabase
      .from("vendor_monthly_balances")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("period_month", periodMonth)
      .eq("period_year", periodYear)
      .maybeSingle();

    if (existing) {
      const current = existing as VendorMonthlyBalance;
      const updatedInvAmount = current.inv_amount + debitAmount;
      const updatedApplyAmount = current.apply_amount + creditAmount;
      const newBalance = current.open_amount + updatedInvAmount + current.dr_amount - updatedApplyAmount - current.paid_amount;

      const { data, error } = await supabase
        .from("vendor_monthly_balances")
        .update({
          inv_amount: updatedInvAmount,
          apply_amount: updatedApplyAmount,
          balance: newBalance,
        })
        .eq("id", current.id)
        .select()
        .single();

      if (error) throw new AppError(`Failed to update monthly balance: ${error.message}`, "VENDOR_ERROR");
      return data as VendorMonthlyBalance;
    }

    let openAmount = 0;

    if (periodMonth === 1) {
      const { data: prevYearBalance } = await supabase
        .from("vendor_monthly_balances")
        .select("balance")
        .eq("vendor_id", vendorId)
        .eq("period_year", periodYear - 1)
        .eq("period_month", 12)
        .maybeSingle();

      openAmount = prevYearBalance
        ? (prevYearBalance as { balance: number }).balance
        : 0;
    } else {
      const { data: prevBalance } = await supabase
        .from("vendor_monthly_balances")
        .select("balance")
        .eq("vendor_id", vendorId)
        .eq("period_year", periodYear)
        .eq("period_month", periodMonth - 1)
        .maybeSingle();

      openAmount = prevBalance
        ? (prevBalance as { balance: number }).balance
        : 0;
    }

    const newBalance = openAmount + debitAmount - creditAmount;

    const { data, error } = await supabase
      .from("vendor_monthly_balances")
      .insert({
        vendor_id: vendorId,
        period_month: periodMonth,
        period_year: periodYear,
        open_amount: openAmount,
        open_dr: 0,
        open_apply: 0,
        open_paid: 0,
        open_balance: openAmount,
        inv_amount: debitAmount,
        dr_amount: 0,
        apply_amount: creditAmount,
        paid_amount: 0,
        balance: newBalance,
      })
      .select()
      .single();

    if (error) throw new AppError(`Failed to create monthly balance: ${error.message}`, "VENDOR_ERROR");
    return data as VendorMonthlyBalance;
  }
}

export const vendorService = new VendorService();