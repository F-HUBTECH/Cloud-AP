"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";

interface InvoiceRow {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_name: string;
  inv_number: string | null;
  ap_type_code: string | null;
  total_amount: number;
  vat_amount: number;
  wht_amount: number;
  balance: number;
  status: string;
}

export default function InvoiceRegisterPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierCode, setSupplierCode] = useState("");
  const [apTypeCode, setApTypeCode] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [vendors, setVendors] = useState<{ code: string; name_en: string }[]>([]);
  const [apTypes, setApTypes] = useState<{ code: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const supabase = createClient();

  async function loadFilters() {
    const [vendorsResult, typesResult] = await Promise.all([
      supabase.from("vendors").select("code, name_en").eq("is_active", true).order("code"),
      supabase.from("ap_types").select("code, name").order("code"),
    ]);
    if (vendorsResult.data) setVendors(vendorsResult.data as { code: string; name_en: string }[]);
    if (typesResult.data) setApTypes(typesResult.data as { code: string; name: string }[]);
  }

  useState(() => { loadFilters(); });

  async function runReport() {
    setIsLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("id, doc_number, doc_date, supplier_code, inv_number, ap_type_code, total_amount, vat_amount, wht_amount, balance, status")
        .gte("doc_date", dateFrom)
        .lte("doc_date", dateTo)
        .order("doc_date", { ascending: true });

      if (supplierCode) query = query.eq("supplier_code", supplierCode);
      if (apTypeCode) query = query.eq("ap_type_code", apTypeCode);
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

      setInvoices((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        doc_number: r.doc_number as string,
        doc_date: r.doc_date as string,
        supplier_code: r.supplier_code as string,
        supplier_name: vendorMap.get(r.supplier_code as string) ?? "",
        inv_number: r.inv_number as string | null,
        ap_type_code: r.ap_type_code as string | null,
        total_amount: Number(r.total_amount) || 0,
        vat_amount: Number(r.vat_amount) || 0,
        wht_amount: Number(r.wht_amount) || 0,
        balance: Number(r.balance) || 0,
        status: r.status as string,
      })));

      setHasRun(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const totals = {
    amount: invoices.reduce((s, r) => s + r.total_amount, 0),
    vat: invoices.reduce((s, r) => s + r.vat_amount, 0),
    wht: invoices.reduce((s, r) => s + r.wht_amount, 0),
    balance: invoices.reduce((s, r) => s + r.balance, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Register</h1>
        <p className="text-muted-foreground">Summary of all invoices posted within a date range</p>
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
            <label htmlFor="ap_type" className="label-text">AP Type</label>
            <select id="ap_type" value={apTypeCode} onChange={(e) => setApTypeCode(e.target.value)} className="input-field w-36">
              <option value="">All Types</option>
              {apTypes.map((t) => (<option key={t.code} value={t.code}>{t.code} - {t.name}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="status" className="label-text">Status</label>
            <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-36">
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
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
                <th className="date-column">Date</th>
                <th>Vendor</th>
                <th>Invoice No.</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th className="text-right">VAT</th>
                <th className="text-right">WHT</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No invoices found</td></tr>
              ) : (
                invoices.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.doc_number}</td>
                    <td className="date-column">{formatDate(r.doc_date)}</td>
                    <td>
                      <span className="font-medium">{r.supplier_code}</span>
                      <span className="ml-1 text-muted-foreground">{r.supplier_name}</span>
                    </td>
                    <td className="font-mono">{r.inv_number ?? "-"}</td>
                    <td>{r.ap_type_code ?? "-"}</td>
                    <td className="text-right font-mono">{formatCurrency(r.total_amount)}</td>
                    <td className="text-right font-mono">{formatCurrency(r.vat_amount)}</td>
                    <td className="text-right font-mono">{formatCurrency(r.wht_amount)}</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(r.balance)}</td>
                    <td><span className={`badge ${r.status === "paid" ? "badge-success" : r.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>{r.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
            {invoices.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={5} className="text-right">Total</td>
                  <td className="text-right font-mono">{formatCurrency(totals.amount)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.vat)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.wht)}</td>
                  <td className="text-right font-mono">{formatCurrency(totals.balance)}</td>
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
