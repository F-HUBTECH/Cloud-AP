import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

interface DebitNoteRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  supplier_name: string;
  inv_number: string | null;
  total_amount: number;
  balance: number;
  status: string;
}

async function searchDebitNotes(
  search?: string,
  status?: string
): Promise<DebitNoteRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("invoices")
    .select(
      "id, doc_number, doc_date, supplier_code, supplier_id, inv_number, total_amount, balance, status"
    )
    .eq("transaction_type", "B")
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

  const supplierIds = [...new Set(data.map((dn) => dn.supplier_id).filter(Boolean))];
  const supplierMap = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name_en, name_th")
      .in("id", supplierIds);
    for (const vendor of vendors ?? []) {
      supplierMap.set(vendor.id, vendor.name_th || vendor.name_en || "");
    }
  }

  return data.map((dn) => ({
    ...dn,
    supplier_name: supplierMap.get(dn.supplier_id) ?? "",
    total_amount: Number(dn.total_amount) || 0,
    balance: Number(dn.balance) || 0,
  }));
}

const statusColorMap: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  posted: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

export default async function DebitNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const debitNotes = await searchDebitNotes(params.q, params.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Debit Notes</h1>
          <p className="text-muted-foreground">
            Manage debit note transactions
          </p>
        </div>
        <Link href="/debit-notes/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Debit Note
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
        <table className="data-table table-fixed">
          <colgroup>
            <col className="w-[14%]" /><col className="w-[11%]" /><col className="w-[23%]" />
            <col className="w-[15%]" /><col className="w-[12%]" /><col className="w-[13%]" /><col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="whitespace-nowrap">Doc Number</th>
              <th className="whitespace-nowrap">Date</th>
              <th>Vendor</th>
              <th className="whitespace-nowrap">Invoice No.</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Balance</th>
              <th className="whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {debitNotes.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No debit notes found
                </td>
              </tr>
            ) : (
              debitNotes.map((dn) => (
                <tr key={dn.id}>
                  <td>
                    <Link
                      href={`/debit-notes/${dn.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {dn.doc_number}
                    </Link>
                  </td>
                  <td>{formatDate(dn.doc_date)}</td>
                  <td title={`${dn.supplier_code} ${dn.supplier_name}`}>
                    <span className="block truncate">{dn.supplier_code}{dn.supplier_name ? ` — ${dn.supplier_name}` : ""}</span>
                  </td>
                  <td className="text-muted-foreground">
                    {dn.inv_number ?? "-"}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(dn.total_amount)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(dn.balance)}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        statusColorMap[dn.status] ?? "badge-info"
                      )}
                    >
                      {dn.status.replace(/_/g, " ")}
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
