import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

interface VendorRow {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
  tel: string | null;
  email: string | null;
  is_active: boolean;
  total_amount: number;
  total_payment: number;
  balance: number;
}

interface VendorsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

async function getVendors(
  search?: string,
  status?: string,
  page: number = 1
): Promise<{ vendors: VendorRow[]; total: number }> {
  const supabase = await createServerClient();
  const pageSize = DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("vendors")
    .select(
      "id, code, name_en, name_th, tel, email, is_active, total_amount, total_payment",
      { count: "exact" }
    )
    .order("code")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(
      `code.ilike.%${search}%,name_en.ilike.%${search}%,name_th.ilike.%${search}%`
    );
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, count } = await query;

  const vendors = (data ?? []).map((v) => ({
    ...v,
    total_amount: Number(v.total_amount) || 0,
    total_payment: Number(v.total_payment) || 0,
    balance: (Number(v.total_amount) || 0) - (Number(v.total_payment) || 0),
  }));

  return { vendors, total: count ?? 0 };
}

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { vendors, total } = await getVendors(params.q, params.status, page);

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const showPagination = totalPages > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            {total} vendor{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/vendors/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Link>
      </div>

      {/* Search + Filter */}
      <form method="get" className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="Search by code, name (EN/TH)..."
            defaultValue={params.q}
            className="input-field pl-10"
          />
        </div>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="input-field w-36"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className="btn-outline shrink-0">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
        {(params.q || params.status) && (
          <Link href="/vendors" className="btn-ghost shrink-0 text-sm">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      {vendors.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          {params.q || params.status ? (
            <>
              <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No vendors match your search
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search terms or{" "}
                <Link href="/vendors" className="text-primary hover:underline">
                  clear all filters
                </Link>
              </p>
            </>
          ) : (
            <>
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No vendors yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first vendor to get started
              </p>
              <Link href="/vendors/new" className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                Add Vendor
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Tel</th>
                  <th>Email</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {vendor.code}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="hover:underline"
                      >
                        {vendor.name_th || vendor.name_en}
                      </Link>
                      {vendor.name_th &&
                        vendor.name_en &&
                        vendor.name_th !== vendor.name_en && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({vendor.name_en})
                          </span>
                        )}
                    </td>
                    <td className="text-muted-foreground">
                      {vendor.tel ?? "-"}
                    </td>
                    <td className="text-muted-foreground">
                      {vendor.email ?? "-"}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        vendor.balance > 0
                          ? "font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatCurrency(vendor.balance)}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "badge",
                          vendor.is_active ? "badge-success" : "badge-danger"
                        )}
                      >
                        {vendor.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {showPagination && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                {page > 1 ? (
                  <Link
                    href={`/vendors?${new URLSearchParams({ ...(params.q && { q: params.q }), ...(params.status && { status: params.status }), page: String(page - 1) }).toString()}`}
                    className="btn-ghost px-2 py-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="btn-ghost px-2 py-1 opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .map((p, i, arr) => {
                    const showEllipsis =
                      i > 0 && p - arr[i - 1] > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-muted-foreground">
                            …
                          </span>
                        )}
                        <Link
                          href={`/vendors?${new URLSearchParams({ ...(params.q && { q: params.q }), ...(params.status && { status: params.status }), page: String(p) }).toString()}`}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-sm",
                            p === page
                              ? "bg-primary text-primary-foreground font-medium"
                              : "hover:bg-accent"
                          )}
                        >
                          {p}
                        </Link>
                      </span>
                    );
                  })}

                {page < totalPages ? (
                  <Link
                    href={`/vendors?${new URLSearchParams({ ...(params.q && { q: params.q }), ...(params.status && { status: params.status }), page: String(page + 1) }).toString()}`}
                    className="btn-ghost px-2 py-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="btn-ghost px-2 py-1 opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
