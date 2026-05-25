"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Loader2, FileDown } from "lucide-react";

interface AgingRow {
  supplier_code: string;
  supplier_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  days_120_plus: number;
  total: number;
}

export default function AgingReportPage() {
  const [periodEnd, setPeriodEnd] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [aging, setAging] = useState<AgingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function runReport() {
    setIsLoading(true);
    const supabase = createClient();

    const { data: invoices } = await supabase
      .from("invoices")
      .select("supplier_code, supplier_id, due_date, doc_date, balance, total_amount, status")
      .in("status", ["approved", "posted"]);

    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, code, name_en, name_th")
      .eq("is_active", true);

    if (!invoices || !vendors) {
      setIsLoading(false);
      return;
    }

    const vendorMap = new Map(vendors.map((v) => [v.code, v.name_th || v.name_en]));
    const grouped = new Map<string, { current: number; d30: number; d60: number; d90: number; d120p: number }>();

    const endDate = new Date(periodEnd);

    for (const inv of invoices) {
      const balance = Number(inv.balance) || 0;
      if (balance <= 0) continue;

      if (!grouped.has(inv.supplier_code)) {
        grouped.set(inv.supplier_code, { current: 0, d30: 0, d60: 0, d90: 0, d120p: 0 });
      }

      const agingData = grouped.get(inv.supplier_code)!;
      const dueDate = new Date(String(inv.due_date || inv.doc_date || periodEnd));
      const diffDays = Math.floor(
        (endDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 0) {
        agingData.current += balance;
      } else if (diffDays <= 30) {
        agingData.d30 += balance;
      } else if (diffDays <= 60) {
        agingData.d60 += balance;
      } else if (diffDays <= 90) {
        agingData.d90 += balance;
      } else {
        agingData.d120p += balance;
      }
    }

    const results: AgingRow[] = [];
    grouped.forEach((val, code) => {
      const total = val.current + val.d30 + val.d60 + val.d90 + val.d120p;
      if (total > 0) {
        results.push({
          supplier_code: code,
          supplier_name: vendorMap.get(code) || code,
          current: val.current,
          days_30: val.d30,
          days_60: val.d60,
          days_90: val.d90,
          days_120_plus: val.d120p,
          total,
        });
      }
    });

    results.sort((a, b) => b.total - a.total);
    setAging(results);
    setIsLoading(false);
  }

  const totals = {
    current: aging.reduce((s, r) => s + r.current, 0),
    days_30: aging.reduce((s, r) => s + r.days_30, 0),
    days_60: aging.reduce((s, r) => s + r.days_60, 0),
    days_90: aging.reduce((s, r) => s + r.days_90, 0),
    days_120_plus: aging.reduce((s, r) => s + r.days_120_plus, 0),
    total: aging.reduce((s, r) => s + r.total, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AP Aging Report</h1>
        <p className="text-muted-foreground">
          Vendor balances grouped by aging buckets
        </p>
      </div>

      <div className="card p-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="period_end" className="label-text">
              As of Date
            </label>
            <input
              id="period_end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="input-field w-48"
            />
          </div>
          <button
            onClick={runReport}
            disabled={isLoading}
            className="btn-primary"
          >
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

      {aging.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Vendor Name</th>
                <th className="text-right">Current</th>
                <th className="text-right">1-30 Days</th>
                <th className="text-right">31-60 Days</th>
                <th className="text-right">61-90 Days</th>
                <th className="text-right">120+ Days</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {aging.map((row) => (
                <tr key={row.supplier_code}>
                  <td className="font-medium">{row.supplier_code}</td>
                  <td>{row.supplier_name}</td>
                  <td className="text-right font-mono">
                    {formatCurrency(row.current)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(row.days_30)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(row.days_60)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(row.days_90)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(row.days_120_plus)}
                  </td>
                  <td className="text-right font-mono font-semibold">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td colSpan={2} className="text-right">
                  Total
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(totals.current)}
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(totals.days_30)}
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(totals.days_60)}
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(totals.days_90)}
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(totals.days_120_plus)}
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(totals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}