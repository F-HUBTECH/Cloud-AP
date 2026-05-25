"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

interface VendorOption {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
}

interface TransactionRow {
  id: string;
  doc_number: string;
  doc_date: string;
  doc_type: string;
  inv_number: string | null;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

export default function VendorCardPage() {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runningBalance, setRunningBalance] = useState(0);

  useEffect(() => {
    async function fetchVendors() {
      const supabase = createClient();
      const { data } = await supabase
        .from("vendors")
        .select("id, code, name_en, name_th")
        .eq("is_active", true)
        .order("code");
      if (data) setVendors(data as VendorOption[]);
    }
    fetchVendors();
  }, []);

  async function runReport() {
    if (!selectedVendor) return;
    setIsLoading(true);

    const supabase = createClient();

    let query = supabase
      .from("invoices")
      .select("id, doc_number, doc_date, inv_number, total_amount, balance, status, transaction_type")
      .eq("supplier_id", selectedVendor)
      .order("doc_date", { ascending: true });

    if (periodStart) {
      query = query.gte("doc_date", periodStart);
    }
    if (periodEnd) {
      query = query.lte("doc_date", periodEnd);
    }

    const { data: invoices } = await query;

    let payQuery = supabase
      .from("payments")
      .select("id, doc_number, doc_date, total_amount, total_net, status")
      .eq("supplier_id", selectedVendor)
      .order("doc_date", { ascending: true });

    if (periodStart) {
      payQuery = payQuery.gte("doc_date", periodStart);
    }
    if (periodEnd) {
      payQuery = payQuery.lte("doc_date", periodEnd);
    }

    const { data: payments } = await payQuery;

    const rows: TransactionRow[] = [];
    let balance = 0;

    if (invoices) {
      for (const inv of invoices) {
        const isDebitNote = inv.transaction_type === "B";
        const amount = Number(inv.total_amount) || 0;

        if (isDebitNote) {
          balance += amount;
          rows.push({
            id: inv.id,
            doc_number: inv.doc_number,
            doc_date: inv.doc_date,
            doc_type: "Debit Note",
            inv_number: inv.inv_number,
            debit: amount,
            credit: 0,
            balance,
            status: inv.status,
          });
        } else {
          balance += amount;
          rows.push({
            id: inv.id,
            doc_number: inv.doc_number,
            doc_date: inv.doc_date,
            doc_type: "Invoice",
            inv_number: inv.inv_number,
            debit: amount,
            credit: 0,
            balance,
            status: inv.status,
          });
        }
      }
    }

    if (payments) {
      for (const pay of payments) {
        const amount = Number(pay.total_net || pay.total_amount) || 0;
        balance -= amount;
        rows.push({
          id: pay.id,
          doc_number: pay.doc_number,
          doc_date: pay.doc_date,
          doc_type: "Payment",
          inv_number: null,
          debit: 0,
          credit: amount,
          balance,
          status: pay.status,
        });
      }
    }

    rows.sort((a, b) => new Date(a.doc_date).getTime() - new Date(b.doc_date).getTime());

    setTransactions(rows);
    setRunningBalance(balance);
    setIsLoading(false);
  }

  const totalDebit = transactions.reduce((s, r) => s + r.debit, 0);
  const totalCredit = transactions.reduce((s, r) => s + r.credit, 0);

  const statusColorMap: Record<string, string> = {
    draft: "badge-info",
    pending_approval: "badge-warning",
    approved: "badge-success",
    posted: "badge-success",
    paid: "badge-success",
    cancelled: "badge-danger",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Card Report</h1>
        <p className="text-muted-foreground">
          View all transactions for a specific vendor
        </p>
      </div>

      <div className="card p-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="vendor" className="label-text">Vendor *</label>
            <select
              id="vendor"
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="input-field w-64"
            >
              <option value="">Select a vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code} - {v.name_th || v.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="period_start" className="label-text">From Date</label>
            <input
              id="period_start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="input-field w-48"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="period_end" className="label-text">To Date</label>
            <input
              id="period_end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="input-field w-48"
            />
          </div>
          <button onClick={runReport} disabled={isLoading || !selectedVendor} className="btn-primary">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Run Report"
            )}
          </button>
        </div>
      </div>

      {transactions.length > 0 && (
        <>
          <div className="card p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="label-text text-muted-foreground">Total Debit</span>
                <p className="mt-1 text-lg font-bold font-mono">{formatCurrency(totalDebit)}</p>
              </div>
              <div>
                <span className="label-text text-muted-foreground">Total Credit</span>
                <p className="mt-1 text-lg font-bold font-mono">{formatCurrency(totalCredit)}</p>
              </div>
              <div>
                <span className="label-text text-muted-foreground">Ending Balance</span>
                <p className="mt-1 text-lg font-bold font-mono">{formatCurrency(runningBalance)}</p>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doc Number</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Invoice No.</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono font-medium">{row.doc_number}</td>
                    <td>{formatDate(row.doc_date)}</td>
                    <td>{row.doc_type}</td>
                    <td className="text-muted-foreground">{row.inv_number ?? "-"}</td>
                    <td className="text-right font-mono">
                      {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                    </td>
                    <td className="text-right font-mono">
                      {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {formatCurrency(row.balance)}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "badge",
                          statusColorMap[row.status] ?? "badge-info"
                        )}
                      >
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}