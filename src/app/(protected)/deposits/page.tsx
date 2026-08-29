import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

interface DepositRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  supplier_name: string;
  deposit_amount: number;
  deposit_vat: number;
  po_number: string | null;
  payment_code: string | null;
  status: string;
}

async function searchDeposits(
  search?: string,
  status?: string
): Promise<DepositRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("deposit_payments")
    .select(
      "id, doc_number, doc_date, supplier_code, supplier_id, deposit_amount, deposit_vat, po_number, payment_code, status"
    )
    .order("doc_date", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `doc_number.ilike.%${search}%,supplier_code.ilike.%${search}%,po_number.ilike.%${search}%`
    );
  }

  const { data } = await query;
  if (!data) return [];

  const supplierIds = [...new Set(data.map((d) => d.supplier_id).filter(Boolean))];
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

  return data.map((d) => ({
    ...d,
    supplier_name: supplierMap.get(d.supplier_id) ?? "",
    deposit_amount: Number(d.deposit_amount) || 0,
    deposit_vat: Number(d.deposit_vat) || 0,
  }));
}

const statusColorMap: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  posted: "badge-success",
  cancelled: "badge-danger",
};

export default async function DepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const deposits = await searchDeposits(params.q, params.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deposits</h1>
          <p className="text-muted-foreground">
            Manage deposit payments to vendors
          </p>
        </div>
        <Link href="/deposits/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Deposit
        </Link>
      </div>

      <div className="card p-4">
        <form method="get" className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search by doc number, supplier, or PO number..."
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
            <col className="w-[13%]" /><col className="w-[11%]" /><col className="w-[22%]" />
            <col className="w-[13%]" /><col className="w-[9%]" /><col className="w-[12%]" />
            <col className="w-[10%]" /><col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="whitespace-nowrap">Doc Number</th>
              <th className="whitespace-nowrap">Date</th>
              <th>Vendor</th>
              <th className="text-right">Deposit Amount</th>
              <th className="text-right">VAT</th>
              <th className="whitespace-nowrap">PO Number</th>
              <th className="whitespace-nowrap">Payment Code</th>
              <th className="whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No deposits found
                </td>
              </tr>
            ) : (
              deposits.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link
                      href={`/deposits/${d.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {d.doc_number}
                    </Link>
                  </td>
                  <td>{formatDate(d.doc_date)}</td>
                  <td title={`${d.supplier_code} ${d.supplier_name}`}>
                    <span className="block truncate">{d.supplier_code}{d.supplier_name ? ` — ${d.supplier_name}` : ""}</span>
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(d.deposit_amount)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(d.deposit_vat)}
                  </td>
                  <td className="text-muted-foreground">
                    {d.po_number ?? "-"}
                  </td>
                  <td className="text-muted-foreground">
                    {d.payment_code ?? "-"}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        statusColorMap[d.status] ?? "badge-info"
                      )}
                    >
                      {d.status.replace(/_/g, " ")}
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
