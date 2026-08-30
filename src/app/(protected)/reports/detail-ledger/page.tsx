"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";

interface AccountOption {
  code: string;
  name: string;
}

interface LedgerRow {
  id: string;
  doc_number: string;
  doc_date: string;
  description: string | null;
  supplier_code: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export default function DetailLedgerPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchAccounts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("chart_of_accounts")
        .select("code, name")
        .eq("is_active", true)
        .order("code");
      if (data) setAccounts(data as AccountOption[]);
    }
    fetchAccounts();
  }, []);

  async function runReport() {
    if (!selectedAccount) return;
    setIsLoading(true);

    const supabase = createClient();

    const query = supabase
      .from("invoice_items")
      .select("id, invoice_id, gl_account, description, dr_amount, cr_amount, invoices(doc_number, doc_date, supplier_code)")
      .eq("gl_account", selectedAccount)
      .order("invoice_id", { ascending: true });

    const { data: items } = await query;

    const ledgerRows: LedgerRow[] = [];
    let balance = 0;

    if (items) {
      for (const item of items) {
        const invoice = item.invoices as unknown as {
          doc_number: string;
          doc_date: string;
          supplier_code: string | null;
        } | null;

        if (invoice) {
          let filterPass = true;
          if (periodStart && invoice.doc_date < periodStart) filterPass = false;
          if (periodEnd && invoice.doc_date > periodEnd) filterPass = false;
          if (!filterPass) continue;

          const debit = Number(item.dr_amount) || 0;
          const credit = Number(item.cr_amount) || 0;
          balance += debit - credit;

          ledgerRows.push({
            id: item.id,
            doc_number: invoice.doc_number,
            doc_date: invoice.doc_date,
            description: item.description,
            supplier_code: invoice.supplier_code,
            debit,
            credit,
            balance,
          });
        }
      }
    }

    setRows(ledgerRows);
    setIsLoading(false);
  }

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Detail Ledger Report</h1>
        <p className="text-muted-foreground">
          View all transactions for a specific GL account
        </p>
      </div>

      <div className="card p-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="account" className="label-text">Account *</label>
            <select
              id="account"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="input-field w-64"
            >
              <option value="">Select an account...</option>
              {accounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} - {a.name}
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
          <button onClick={runReport} disabled={isLoading || !selectedAccount} className="btn-primary">
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

      {rows.length > 0 && (
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
                <span className="label-text text-muted-foreground">Net Balance</span>
                <p className="mt-1 text-lg font-bold font-mono">{formatCurrency(totalDebit - totalCredit)}</p>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doc Number</th>
                <th className="date-column">Date</th>
                  <th className="text-center">Supplier</th>
                  <th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono font-medium">{row.doc_number}</td>
                    <td className="date-column">{formatDate(row.doc_date)}</td>
                    <td className="text-center text-muted-foreground">{row.supplier_code ?? "-"}</td>
                    <td className="text-muted-foreground">{row.description ?? "-"}</td>
                    <td className="text-right font-mono">
                      {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                    </td>
                    <td className="text-right font-mono">
                      {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={4} className="text-right">Total</td>
                  <td className="text-right font-mono">{formatCurrency(totalDebit)}</td>
                  <td className="text-right font-mono">{formatCurrency(totalCredit)}</td>
                  <td className="text-right font-mono">{formatCurrency(totalDebit - totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
