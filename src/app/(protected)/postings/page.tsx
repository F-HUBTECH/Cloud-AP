import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { Plus, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

interface InvoiceRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  supplier_name: string | null;
  inv_number: string | null;
  total_amount: number;
  balance: number;
  status: string;
}

interface PostingsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

async function searchInvoices(
  search?: string,
  status?: string,
  page: number = 1
): Promise<{ invoices: InvoiceRow[]; total: number }> {
  const supabase = await createServerClient();
  const pageSize = DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("invoices")
    .select(
      "id, doc_number, doc_date, supplier_code, supplier_id, inv_number, total_amount, balance, status",
      { count: "exact" }
    )
    .order("doc_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `doc_number.ilike.%${search}%,supplier_code.ilike.%${search}%,inv_number.ilike.%${search}%`
    );
  }

  const { data, count } = await query;

  const supplierIds = [...new Set((data ?? []).map((inv) => inv.supplier_id))];
  const { data: suppliers } = supplierIds.length
    ? await supabase
        .from("vendors")
        .select("id, name_en, name_th")
        .in("id", supplierIds)
    : { data: [] };
  const supplierNames = new Map(
    (suppliers ?? []).map((supplier) => [
      supplier.id,
      supplier.name_th || supplier.name_en,
    ])
  );

  const invoices = (data ?? []).map((inv) => ({
    ...inv,
    supplier_name: supplierNames.get(inv.supplier_id) ?? null,
    total_amount: Number(inv.total_amount) || 0,
    balance: Number(inv.balance) || 0,
  }));

  return { invoices, total: count ?? 0 };
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "posted", label: "Posted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "voided", label: "Voided" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  posted: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

export default async function PostingsPage({
  searchParams,
}: PostingsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { invoices, total } = await searchInvoices(params.q, params.status, page);

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const showPagination = totalPages > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AP Vouchers</h1>
          <p className="text-sm text-muted-foreground">
            {total} voucher{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/postings/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Voucher
        </Link>
      </div>

      {/* Search + Filter */}
      <form method="get" className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="Search by doc number, supplier, or invoice number..."
            defaultValue={params.q}
            className="input-field pl-10"
          />
        </div>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="input-field w-44"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-outline shrink-0">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
        {(params.q || params.status) && (
          <Link href="/postings" className="btn-ghost shrink-0 text-sm">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          {params.q || params.status ? (
            <>
              <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No vouchers match your search
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search terms or{" "}
                <Link href="/postings" className="text-primary hover:underline">
                  clear all filters
                </Link>
              </p>
            </>
          ) : (
            <>
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No vouchers yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first AP voucher to get started
              </p>
              <Link href="/postings/new" className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                New Voucher
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table table-fixed">
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[22%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Doc Number</th>
                  <th className="whitespace-nowrap">Date</th>
                  <th className="text-center">Supplier</th>
                  <th>Invoice No.</th>
                  <th className="text-right whitespace-nowrap">Amount</th>
                  <th className="text-right whitespace-nowrap">Balance</th>
                  <th className="whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/postings/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.doc_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(inv.doc_date)}</td>
                    <td className="text-center">
                      <Link
                        href={`/vendors/${inv.supplier_id}`}
                        className="hover:underline"
                      >
                        <span className="block truncate" title={inv.supplier_name ?? inv.supplier_code}>
                          {inv.supplier_code}
                          {inv.supplier_name && ` — ${inv.supplier_name}`}
                        </span>
                      </Link>
                    </td>
                    <td className="truncate text-muted-foreground" title={inv.inv_number ?? undefined}>
                      {inv.inv_number ?? "—"}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        inv.balance > 0
                          ? "font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatCurrency(inv.balance)}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={cn(
                          "badge",
                          STATUS_BADGE[inv.status] ?? "badge-info"
                        )}
                      >
                        {inv.status.replace(/_/g, " ")}
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
                    href={`/postings?${new URLSearchParams({ ...(params.q && { q: params.q }), ...(params.status && { status: params.status }), page: String(page - 1) }).toString()}`}
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
                          href={`/postings?${new URLSearchParams({ ...(params.q && { q: params.q }), ...(params.status && { status: params.status }), page: String(p) }).toString()}`}
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
                    href={`/postings?${new URLSearchParams({ ...(params.q && { q: params.q }), ...(params.status && { status: params.status }), page: String(page + 1) }).toString()}`}
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
