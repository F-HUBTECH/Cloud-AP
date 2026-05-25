import { createServerClient } from "@/lib/supabase/server";
import type { Vendor, VendorWithBalance, VendorAging, VendorMonthlyBalance } from "./vendor.types";

export const vendorKeys = {
  all: ["vendors"] as const,
  lists: () => [...vendorKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...vendorKeys.lists(), params] as const,
  details: () => [...vendorKeys.all, "detail"] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  balances: (vendorId: string) => [...vendorKeys.detail(vendorId), "balances"] as const,
  balance: (vendorId: string, month: number, year: number) =>
    [...vendorKeys.balances(vendorId), { month, year }] as const,
  aging: () => [...vendorKeys.all, "aging"] as const,
  agingByVendor: (vendorId: string) => [...vendorKeys.aging(), vendorId] as const,
  search: (query: string) => [...vendorKeys.all, "search", query] as const,
};

export async function getVendorsWithBalance(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}): Promise<VendorWithBalance[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("vendors")
    .select("*, monthly_balance:vendor_monthly_balances!inner(*)");

  if (params?.isActive !== undefined) {
    query = query.eq("is_active", params.isActive);
  }

  if (params?.search) {
    query = query.or(
      `code.ilike.%${params.search}%,name_en.ilike.%${params.search}%,tax_id.ilike.%${params.search}%`,
    );
  }

  const pageSize = params?.pageSize ?? 20;
  const page = params?.page ?? 1;

  query = query
    .order("code", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch vendors with balance: ${error.message}`);

  return (data as unknown as VendorWithBalance[]) ?? [];
}

export async function getVendorAging(
  asOfDate?: string,
): Promise<VendorAging[]> {
  const supabase = await createServerClient();

  if (asOfDate) {
    const { data, error } = await supabase
      .from("vendor_aging_view")
      .select("*")
      .lte("aging_date", asOfDate);

    if (error) throw new Error(`Failed to fetch vendor aging: ${error.message}`);
    return (data as VendorAging[]) ?? [];
  }

  const { data, error } = await supabase
    .from("vendor_aging_view")
    .select("*");

  if (error) throw new Error(`Failed to fetch vendor aging: ${error.message}`);
  return (data as VendorAging[]) ?? [];
}

export async function getVendorMonthlyBalances(
  vendorId: string,
  periodYear?: number,
): Promise<VendorMonthlyBalance[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("vendor_monthly_balances")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  if (periodYear) {
    query = query.eq("period_year", periodYear);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch monthly balances: ${error.message}`);
  return (data as VendorMonthlyBalance[]) ?? [];
}

export async function getVendorWithBalance(
  vendorId: string,
): Promise<VendorWithBalance | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*, monthly_balance:vendor_monthly_balances(*)")
    .eq("id", vendorId)
    .single();

  if (error) throw new Error(`Failed to fetch vendor with balance: ${error.message}`);
  if (!data) return null;

  const vendor = data as Vendor & {
    monthly_balance: VendorMonthlyBalance | VendorMonthlyBalance[] | null;
  };

  const monthlyBalance = Array.isArray(vendor.monthly_balance)
    ? vendor.monthly_balance[0] ?? null
    : vendor.monthly_balance;

  const outstandingBalance = monthlyBalance?.balance ?? vendor.open_amount;

  return {
    ...vendor,
    monthly_balance: monthlyBalance,
    outstanding_balance: outstandingBalance,
  };
}

export async function getActiveVendors(): Promise<Vendor[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) throw new Error(`Failed to fetch active vendors: ${error.message}`);
  return (data as Vendor[]) ?? [];
}