import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Plus, Search, Filter } from "lucide-react";
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

async function searchVendors(
  search?: string,
  status?: string
): Promise<VendorRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("vendors")
    .select(
      "id, code, name_en, name_th, tel, email, is_active, total_amount, total_payment"
    )
    .order("code")
    .limit(100);

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

  const { data } = await query;
  if (!data) return [];

  return data.map((v) => ({
    ...v,
    total_amount: Number(v.total_amount) || 0,
    total_payment: Number(v.total_payment) || 0,
    balance: (Number(v.total_amount) || 0) - (Number(v.total_payment) || 0),
  }));
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const vendors = await searchVendors(params.q, params.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage your suppliers and vendors
          </p>
        </div>
        <Link href="/vendors/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Link>
      </div>

      <div className="card p-4">
        <form method="get" className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search vendors by code or name..."
              defaultValue={params.q}
              className="input-field pl-10"
            />
          </div>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="input-field w-40"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="submit" className="btn-outline">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </form>
      </div>

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
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No vendors found
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
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
                    {vendor.name_th || vendor.name_en}
                    {vendor.name_th && vendor.name_en !== vendor.name_th && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({vendor.name_en})
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground">{vendor.tel ?? "-"}</td>
                  <td className="text-muted-foreground">{vendor.email ?? "-"}</td>
                  <td className="text-right font-mono">
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}