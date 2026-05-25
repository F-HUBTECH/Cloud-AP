import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

interface InvoiceRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  inv_number: string | null;
  total_amount: number;
  balance: number;
  status: string;
}

async function searchInvoices(
  search?: string,
  status?: string
): Promise<InvoiceRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("invoices")
    .select(
      "id, doc_number, doc_date, supplier_code, supplier_id, inv_number, total_amount, balance, status"
    )
    .order("doc_date", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `doc_number.ilike.%${search}%,supplier_code.ilike.%${search}%,inv_number.ilike.%${search}%`
    );
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((inv) => ({
    ...inv,
    total_amount: Number(inv.total_amount) || 0,
    balance: Number(inv.balance) || 0,
  }));
}

export default async function PostingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const invoices = await searchInvoices(params.q, params.status);

  const statusColorMap: Record<string, string> = {
    draft: "badge-info",
    pending_approval: "badge-warning",
    approved: "badge-success",
    rejected: "badge-danger",
    posted: "badge-success",
    cancelled: "badge-danger",
    voided: "badge-danger",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AP Vouchers</h1>
          <p className="text-muted-foreground">Invoice voucher postings</p>
        </div>
        <Link href="/postings/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Voucher
        </Link>
      </div>

      <div className="card p-4">
        <form method="get" className="flex items-center gap-4">
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
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option>
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
              <th>Doc Number</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Invoice No.</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No vouchers found
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link
                      href={`/postings/${inv.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.doc_number}
                    </Link>
                  </td>
                  <td>{formatDate(inv.doc_date)}</td>
                  <td>{inv.supplier_code}</td>
                  <td className="text-muted-foreground">
                    {inv.inv_number ?? "-"}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(inv.balance)}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        statusColorMap[inv.status] ?? "badge-info"
                      )}
                    >
                      {inv.status.replace(/_/g, " ")}
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