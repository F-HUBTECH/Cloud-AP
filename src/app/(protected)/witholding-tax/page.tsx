"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Loader2, Printer } from "lucide-react";

interface WHTEntry {
  id: string;
  payment_id: string;
  doc_number: string | null;
  wht_code: string;
  wht_rate: number;
  base_amount: number;
  tax_amount: number;
  wht_code2: string | null;
  wht_rate2: number;
  base_amount2: number;
  tax_amount2: number;
  cond_pay: number | null;
  remark: string | null;
  doc_date: string | null;
  payment_doc_number: string | null;
  supplier_code: string | null;
  supplier_name_en: string | null;
  supplier_name_th: string | null;
  supplier_tax_id: string | null;
}

export default function WithholdingTaxPage() {
  const [periodMonth, setPeriodMonth] = useState("");
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear().toString());
  const [supplierCode, setSupplierCode] = useState("");
  const [entries, setEntries] = useState<WHTEntry[]>([]);
  const [vendors, setVendors] = useState<{ code: string; name_en: string; name_th: string | null; tax_id: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const supabase = createClient();

  async function loadVendors() {
    const { data } = await supabase
      .from("vendors")
      .select("code, name_en, name_th, tax_id")
      .eq("is_active", true)
      .order("code");
    if (data) setVendors(data as { code: string; name_en: string; name_th: string | null; tax_id: string | null }[]);
  }

  useState(() => { loadVendors(); });

  async function runReport() {
    setIsLoading(true);
    try {
      let whtQuery = supabase
        .from("withholding_taxes")
        .select("id, payment_id, doc_number, wht_code, wht_rate, base_amount, tax_amount, wht_code2, wht_rate2, base_amount2, tax_amount2, cond_pay, remark, doc_date")
        .order("doc_date", { ascending: true });

      if (periodYear) whtQuery = whtQuery.gte("doc_date", `${periodYear}-01-01`).lte("doc_date", `${periodYear}-12-31`);
      if (supplierCode) {
        const { data: payments } = await supabase
          .from("payments")
          .select("id")
          .eq("supplier_code", supplierCode);
        const paymentIds = (payments ?? []).map((p: { id: string }) => p.id);
        if (paymentIds.length === 0) {
          setEntries([]);
          setHasRun(true);
          setIsLoading(false);
          return;
        }
        whtQuery = whtQuery.in("payment_id", paymentIds);
      }

      const { data: whtData, error } = await whtQuery;
      if (error) throw error;

      const paymentIds = [...new Set((whtData ?? []).map((w: { payment_id: string }) => w.payment_id))];
      const { data: paymentData } = await supabase
        .from("payments")
        .select("id, doc_number, supplier_code")
        .in("id", paymentIds);

      const paymentMap = new Map((paymentData ?? []).map((p: { id: string }) => [p.id, p as Record<string, unknown>]));
      const supplierCodes = [...new Set((paymentData ?? []).map((p: { supplier_code: string }) => p.supplier_code))];
      const vendorMap = new Map<string, { name_en: string; name_th: string | null; tax_id: string | null }>();
      if (supplierCodes.length > 0) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("code, name_en, name_th, tax_id")
          .in("code", supplierCodes);
        for (const v of vendorData ?? []) {
          vendorMap.set(v.code, { name_en: v.name_en, name_th: v.name_th, tax_id: v.tax_id });
        }
      }

      const round = (n: number) => Math.round(n * 100) / 100;

      setEntries((whtData ?? []).map((w: Record<string, unknown>) => {
        const payment = paymentMap.get(w.payment_id as string) as Record<string, unknown> | undefined;
        const supplierCode = (payment?.supplier_code as string) ?? "";
        const vendorInfo = vendorMap.get(supplierCode);
        return {
          id: w.id as string,
          payment_id: w.payment_id as string,
          doc_number: w.doc_number as string | null,
          wht_code: w.wht_code as string,
          wht_rate: round(Number(w.wht_rate) || 0),
          base_amount: round(Number(w.base_amount) || 0),
          tax_amount: round(Number(w.tax_amount) || 0),
          wht_code2: w.wht_code2 as string | null,
          wht_rate2: round(Number(w.wht_rate2) || 0),
          base_amount2: round(Number(w.base_amount2) || 0),
          tax_amount2: round(Number(w.tax_amount2) || 0),
          cond_pay: w.cond_pay as number | null,
          remark: w.remark as string | null,
          doc_date: w.doc_date as string | null,
          payment_doc_number: (payment?.doc_number as string) ?? null,
          supplier_code: supplierCode,
          supplier_name_en: vendorInfo?.name_en ?? "",
          supplier_name_th: vendorInfo?.name_th ?? null,
          supplier_tax_id: vendorInfo?.tax_id ?? null,
        };
      }));

      setHasRun(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredEntries = periodMonth
    ? entries.filter((e) => e.doc_date?.startsWith(`${periodYear}-${periodMonth}`))
    : entries;

  const totalBase1 = filteredEntries.reduce((s, e) => s + e.base_amount, 0);
  const totalTax1 = filteredEntries.reduce((s, e) => s + e.tax_amount, 0);
  const totalBase2 = filteredEntries.reduce((s, e) => s + e.base_amount2, 0);
  const totalTax2 = filteredEntries.reduce((s, e) => s + e.tax_amount2, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withholding Tax Report</h1>
          <p className="text-muted-foreground">WHT certificate data for ภ.ง.3 / ภ.ง.53</p>
        </div>
        {hasRun && filteredEntries.length > 0 && (
          <button onClick={handlePrint} className="btn-outline">
            <Printer className="h-4 w-4" />
            Print
          </button>
        )}
      </div>

      <div className="card p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="period_year" className="label-text">Year</label>
            <input id="period_year" type="number" min="2000" max="2100" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="input-field w-28" />
          </div>
          <div className="space-y-2">
            <label htmlFor="period_month" className="label-text">Month</label>
            <select id="period_month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="input-field w-36">
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m).padStart(2, "0")}>{m.toString().padStart(2, "0")}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="supplier" className="label-text">Vendor</label>
            <select id="supplier" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} className="input-field w-48">
              <option value="">All Vendors</option>
              {vendors.map((v) => (<option key={v.code} value={v.code}>{v.code} - {v.name_en}</option>))}
            </select>
          </div>
          <button onClick={runReport} disabled={isLoading} className="btn-primary">
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : "Run Report"}
          </button>
        </div>
      </div>

      {hasRun && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PV No.</th>
                <th>WHT Doc No.</th>
                <th className="date-column">Date</th>
                <th>Vendor</th>
                <th>Tax ID</th>
                <th>WHT Code 1</th>
                <th className="text-right">Base 1</th>
                <th className="text-right">Rate 1%</th>
                <th className="text-right">Tax 1</th>
                <th>WHT Code 2</th>
                <th className="text-right">Base 2</th>
                <th className="text-right">Rate 2%</th>
                <th className="text-right">Tax 2</th>
                <th>Condition</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={14} className="py-8 text-center text-muted-foreground">No WHT entries found</td></tr>
              ) : (
                filteredEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-medium">{e.payment_doc_number ?? "-"}</td>
                    <td className="font-mono">{e.doc_number ?? "-"}</td>
                    <td className="date-column">{e.doc_date ? formatDate(e.doc_date) : "-"}</td>
                    <td>
                      <span className="font-medium">{e.supplier_code}</span>
                      <span className="ml-1">{e.supplier_name_en}</span>
                    </td>
                    <td className="font-mono text-xs">{e.supplier_tax_id ?? "-"}</td>
                    <td>{e.wht_code}</td>
                    <td className="text-right font-mono">{formatCurrency(e.base_amount)}</td>
                    <td className="text-right font-mono">{e.wht_rate}%</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(e.tax_amount)}</td>
                    <td>{e.wht_code2 ?? "-"}</td>
                    <td className="text-right font-mono">{e.base_amount2 > 0 ? formatCurrency(e.base_amount2) : "-"}</td>
                    <td className="text-right font-mono">{e.wht_rate2 > 0 ? `${e.wht_rate2}%` : "-"}</td>
                    <td className="text-right font-mono">{e.tax_amount2 > 0 ? formatCurrency(e.tax_amount2) : "-"}</td>
                    <td>{e.cond_pay ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredEntries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={6} className="text-right">Total</td>
                  <td className="text-right font-mono">{formatCurrency(totalBase1)}</td>
                  <td></td>
                  <td className="text-right font-mono">{formatCurrency(totalTax1)}</td>
                  <td></td>
                  <td className="text-right font-mono">{formatCurrency(totalBase2)}</td>
                  <td></td>
                  <td className="text-right font-mono">{formatCurrency(totalTax2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
