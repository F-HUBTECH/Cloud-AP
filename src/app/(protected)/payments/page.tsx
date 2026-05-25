import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

interface PaymentRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  pay_method: string;
  cheque_number: string | null;
  total_amount: number;
  total_net: number;
  status: string;
}

async function searchPayments(
  search?: string,
  status?: string
): Promise<PaymentRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("payments")
    .select(
      "id, doc_number, doc_date, supplier_code, supplier_id, pay_method, cheque_number, total_amount, total_net, status"
    )
    .order("doc_date", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `doc_number.ilike.%${search}%,supplier_code.ilike.%${search}%,cheque_number.ilike.%${search}%`
    );
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((p) => ({
    ...p,
    total_amount: Number(p.total_amount) || 0,
    total_net: Number(p.total_net) || 0,
  }));
}

const statusColorMap: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  paid: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  offset: "Offset",
  deposit: "Deposit",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const payments = await searchPayments(params.q, params.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage payment transactions</p>
        </div>
        <Link href="/payments/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Payment
        </Link>
      </div>

      <div className="card p-4">
        <form method="get" className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search by doc number, supplier, or cheque number..."
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
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
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
              <th>Method</th>
              <th>Cheque No.</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <Link
                      href={`/payments/${payment.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {payment.doc_number}
                    </Link>
                  </td>
                  <td>{formatDate(payment.doc_date)}</td>
                  <td>{payment.supplier_code}</td>
                  <td>{methodLabels[payment.pay_method] ?? payment.pay_method}</td>
                  <td className="text-muted-foreground">
                    {payment.cheque_number ?? "-"}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(payment.total_amount)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(payment.total_net)}
                  </td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        statusColorMap[payment.status] ?? "badge-info"
                      )}
                    >
                      {payment.status.replace(/_/g, " ")}
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