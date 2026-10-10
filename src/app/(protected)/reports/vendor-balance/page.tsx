"use client";

import { useState } from "react";
import { getVendorBalanceReport } from "@/modules/report/report.actions";
import { formatCurrency } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";

interface VendorBalance {
  code: string;
  name_en: string;
  name_th: string | null;
  total_amount: number;
  total_payment: number;
  open_amount: number;
  balance: number;
}

export default function VendorBalancePage() {
  const [vendors, setVendors] = useState<VendorBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function runReport() {
    setIsLoading(true);
    try {
      const report = await getVendorBalanceReport();
      setVendors(report.items.map((v) => ({
        code: v.code,
        name_en: v.name_en,
        name_th: v.name_th,
        total_amount: v.totalAmount,
        total_payment: v.totalPayment,
        open_amount: v.openAmount,
        balance: v.balance,
      })));
      setHasRun(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const totals = {
    amount: vendors.reduce((s, r) => s + r.total_amount, 0),
    payment: vendors.reduce((s, r) => s + r.total_payment, 0),
    open: vendors.reduce((s, r) => s + r.open_amount, 0),
    balance: vendors.reduce((s, r) => s + r.balance, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Balance Summary</h1>
        <p className="text-muted-foreground">Vendor balances for the current accounting period</p>
      </div>

      <div className="card p-4">
        <button onClick={runReport} disabled={isLoading} className="btn-primary">
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : "Load Vendor Balances"}
        </button>
      </div>

      {hasRun && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="text-right">Open Amount</th>
                <th className="text-right">Total Charges</th>
                <th className="text-right">Total Payments</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No vendors found</td></tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.code}>
                    <td className="font-medium">{v.code}</td>
                    <td>{v.name_th || v.name_en}</td>
                    <td className="text-right font-mono">{formatCurrency(v.open_amount)}</td>
                    <td className="text-right font-mono">{formatCurrency(v.total_amount)}</td>
                    <td className="text-right font-mono">{formatCurrency(v.total_payment)}</td>
                    <td className={`text-right font-mono font-semibold ${v.balance >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(v.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {vendors.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={2} className="text-right">Grand Total</td>
                  <td className="text-right font-mono">{formatCurrency(totals.open)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.amount)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.payment)}</td>
                  <td className={`text-right font-mono ${totals.balance >= 0 ? "text-success" : "text-danger"}`}>
                    {formatCurrency(totals.balance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
