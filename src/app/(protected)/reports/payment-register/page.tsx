"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";

interface PaymentRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_name: string;
  pay_method: string;
  cheque_number: string | null;
  total_amount: number;
  total_wht: number;
  total_vat: number;
  total_net: number;
  status: string;
}

export default function PaymentRegisterPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierCode, setSupplierCode] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [vendors, setVendors] = useState<{ code: string; name_en: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const supabase = createClient();

  async function runReport() {
    setIsLoading(true);
    try {
      let query = supabase
        .from("payments")
        .select("id, doc_number, doc_date, supplier_code, pay_method, cheque_number, total_amount, total_wht, total_vat, total_net, status")
        .gte("doc_date", dateFrom)
        .lte("doc_date", dateTo)
        .order("doc_date", { ascending: true });

      if (supplierCode) query = query.eq("supplier_code", supplierCode);
      if (statusFilter) query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const supplierCodes = [...new Set((data ?? []).map((r: { supplier_code: string }) => r.supplier_code))];
      const vendorMap = new Map<string, string>();

      if (supplierCodes.length > 0) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("code, name_en")
          .in("code", supplierCodes);
        for (const v of vendorData ?? []) {
          vendorMap.set(v.code, v.name_en ?? "");
        }
      }

      setPayments((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        doc_number: r.doc_number as string,
        doc_date: r.doc_date as string,
        supplier_code: r.supplier_code as string,
        supplier_name: vendorMap.get(r.supplier_code as string) ?? "",
        pay_method: r.pay_method as string,
        cheque_number: r.cheque_number as string | null,
        total_amount: Number(r.total_amount) || 0,
        total_wht: Number(r.total_wht) || 0,
        total_vat: Number(r.total_vat) || 0,
        total_net: Number(r.total_net) || 0,
        status: r.status as string,
      })));

      setHasRun(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadVendors() {
    const { data } = await supabase
      .from("vendors")
      .select("code, name_en")
      .eq("is_active", true)
      .order("code");
    if (data) setVendors(data as { code: string; name_en: string }[]);
  }

  useState(() => { loadVendors(); });

  const totals = {
    amount: payments.reduce((s, r) => s + r.total_amount, 0),
    wht: payments.reduce((s, r) => s + r.total_wht, 0),
    vat: payments.reduce((s, r) => s + r.total_vat, 0),
    net: payments.reduce((s, r) => s + r.total_net, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Register</h1>
        <p className="text-muted-foreground">Summary of all payments within a date range</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="date_from" className="label-text">From Date</label>
            <input id="date_from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field w-44" />
          </div>
          <div className="space-y-2">
            <label htmlFor="date_to" className="label-text">To Date</label>
            <input id="date_to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field w-44" />
          </div>
          <div className="space-y-2">
            <label htmlFor="supplier" className="label-text">Vendor</label>
            <select id="supplier" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} className="input-field w-48">
              <option value="">All Vendors</option>
              {vendors.map((v) => (<option key={v.code} value={v.code}>{v.code} - {v.name_en}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="status" className="label-text">Status</label>
            <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-36">
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
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
                <th>Doc No.</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Method</th>
                <th>Cheque No.</th>
                <th className="text-right">Amount</th>
                <th className="text-right">WHT</th>
                <th className="text-right">VAT</th>
                <th className="text-right">Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No payments found</td></tr>
              ) : (
                payments.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.doc_number}</td>
                    <td>{formatDate(r.doc_date)}</td>
                    <td>
                      <span className="font-medium">{r.supplier_code}</span>
                      <span className="ml-1 text-muted-foreground">{r.supplier_name}</span>
                    </td>
                    <td>{r.pay_method}</td>
                    <td className="font-mono">{r.cheque_number ?? "-"}</td>
                    <td className="text-right font-mono">{formatCurrency(r.total_amount)}</td>
                    <td className="text-right font-mono">{formatCurrency(r.total_wht)}</td>
                    <td className="text-right font-mono">{formatCurrency(r.total_vat)}</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(r.total_net)}</td>
                    <td><span className={`badge ${r.status === "paid" ? "badge-success" : r.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>{r.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={5} className="text-right">Total</td>
                  <td className="text-right font-mono">{formatCurrency(totals.amount)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.wht)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.vat)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.net)}</td>
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