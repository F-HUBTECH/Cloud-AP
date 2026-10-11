"use client";

import Link from "next/link";
import { getDashboardDate } from "@/lib/dashboard/metrics";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTransfer, cancelTransfer } from "@/modules/transfer/transfer.actions";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { Plus, Search, Loader2, ArrowRightLeft, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Transfer {
  id: string;
  source_invoice_id: string | null;
  destination_invoice_id: string | null;
  source_invoice?: { doc_number: string };
  destination_invoice?: { doc_number: string };
  doc_number: string;
  transfer_date: string;
  from_vendor_code: string;
  to_vendor_code: string;
  amount: number;
  remark: string | null;
  status: string;
  created_at: string;
  from_vendor?: { code: string; name_en: string; name_th: string | null };
  to_vendor?: { code: string; name_en: string; name_th: string | null };
}

interface VendorOption {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
}

interface VoucherOption {
  id: string;
  doc_number: string;
  inv_number: string | null;
  doc_date: string;
  due_date: string | null;
  balance: number;
  total_amount: number;
  currency: string;
  ap_type_code: string | null;
  paid_amount: number | null;
  deposit_amount: number | null;
  payment_invoices: { payments: { status: string } | null }[];
  deposit_applications: { status: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  cancelled: "Cancelled",
};

export default function TransferListPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vouchers, setVouchers] = useState<VoucherOption[]>([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [form, setForm] = useState({
    doc_date: getDashboardDate(),
    from_vendor_id: "",
    to_vendor_id: "",
    source_invoice_id: "",
    remark: "",
  });

  const supabase = useMemo(() => createClient(), []);
  const pageSize = 20;
  const selectedVoucher = vouchers.find((voucher) => voucher.id === form.source_invoice_id);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("transfers")
      .select("*, from_vendor:vendors!transfers_from_vendor_id_fkey(code, name_en, name_th), to_vendor:vendors!transfers_to_vendor_id_fkey(code, name_en, name_th), source_invoice:invoices!transfers_source_invoice_id_fkey(doc_number), destination_invoice:invoices!transfers_destination_invoice_id_fkey(doc_number)", { count: "exact" })
      .order("transfer_date", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`doc_number.ilike.%${search}%,remark.ilike.%${search}%`);
    }
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, count, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTransfers((data as Transfer[]) ?? []);
      setTotalPages(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [page, search, statusFilter, supabase]);

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase
      .from("vendors")
      .select("id, code, name_en, name_th")
      .eq("is_active", true)
      .order("code");
    if (data) setVendors(data as VendorOption[]);
  }, [supabase]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    let cancelled = false;
    setVouchers([]);
    setVoucherError(null);
    if (!form.from_vendor_id || !dialogOpen) { setVoucherLoading(false); return; }
    setVoucherLoading(true);
    async function loadVouchers() {
      try {
        const { data, error: loadError } = await supabase.from("invoices")
          .select("id, doc_number, inv_number, doc_date, due_date, balance, total_amount, currency, ap_type_code, paid_amount, deposit_amount, payment_invoices(payments(status)), deposit_applications(status)")
          .eq("supplier_id", form.from_vendor_id).in("status", ["approved", "posted"])
          .gt("balance", 0).order("doc_date", { ascending: false });
        if (cancelled) return;
        if (loadError) { setVoucherError(loadError.message); return; }
        setVouchers(((data ?? []) as unknown as VoucherOption[]).filter((voucher) =>
          Number(voucher.balance) === Number(voucher.total_amount) &&
          Number(voucher.paid_amount ?? 0) === 0 && Number(voucher.deposit_amount ?? 0) === 0 &&
          !["ADN", "ACN", "DR", "B"].includes((voucher.ap_type_code ?? "").toUpperCase()) &&
          !(!voucher.ap_type_code && /^(ADN|ACN)/i.test(voucher.doc_number)) &&
          !voucher.payment_invoices.some((allocation) => allocation.payments && !["cancelled", "voided", "rejected"].includes(allocation.payments.status)) &&
          !voucher.deposit_applications.some((application) => application.status === "active")
        ));
      } catch { if (!cancelled) setVoucherError("Could not load AP vouchers. Please reopen this form to retry."); }
      finally { if (!cancelled) setVoucherLoading(false); }
    }
    loadVouchers();
    return () => { cancelled = true; };
  }, [form.from_vendor_id, dialogOpen, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!selectedVoucher) { setError("Select a source AP voucher"); return; }

      const formData = {
        doc_date: form.doc_date,
        source_invoice_id: selectedVoucher.id,
        to_vendor_id: form.to_vendor_id,
        remark: form.remark,
      };

      const result = await createTransfer(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create transfer");
        return;
      }

      setDialogOpen(false);
      setForm({
        doc_date: getDashboardDate(),
        from_vendor_id: "",
        to_vendor_id: "",
        source_invoice_id: "",
        remark: "",
      });
      await fetchTransfers();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelId) return;
    setCancelLoading(true);
    setError(null);

    try {
      const result = await cancelTransfer(cancelId);
      if (!result.success) {
        setError(result.error ?? "Failed to cancel transfer");
        setCancelId(null);
        return;
      }
      setCancelId(null);
      await fetchTransfers();
    } catch {
      setError("An unexpected error occurred");
      setCancelId(null);
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfer AP Vouchers</h1>
          <p className="text-muted-foreground">Transfer a full unpaid AP voucher to another vendor</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Transfer Voucher
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by doc number or remark..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-36"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doc No.</th>
              <th className="date-column">Date</th>
              <th>Source Voucher</th>
              <th>Destination Voucher</th>
              <th>From Vendor</th>
              <th>To Vendor</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Remark</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-muted-foreground">
                  No transfers found
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.doc_number}</td>
                  <td className="date-column">{formatDate(t.transfer_date)}</td>
                  <td>{t.source_invoice_id ? <Link className="text-primary hover:underline" href={`/postings/${t.source_invoice_id}`}>{t.source_invoice?.doc_number ?? "View source"}</Link> : <span className="text-muted-foreground">Legacy balance transfer</span>}</td>
                  <td>{t.destination_invoice_id ? <Link className="text-primary hover:underline" href={`/postings/${t.destination_invoice_id}`}>{t.destination_invoice?.doc_number ?? "View destination"}</Link> : "—"}</td>
                  <td>
                    {t.from_vendor
                      ? `${t.from_vendor.code} - ${t.from_vendor.name_th || t.from_vendor.name_en}`
                      : t.from_vendor_code}
                  </td>
                  <td>
                    {t.to_vendor
                      ? `${t.to_vendor.code} - ${t.to_vendor.name_th || t.to_vendor.name_en}`
                      : t.to_vendor_code}
                  </td>
                  <td className="text-right font-medium">{formatNumber(t.amount)}</td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        t.status === "active" ? "badge-success" : "badge-danger"
                      )}
                    >
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate">{t.remark ?? "-"}</td>
                  <td className="text-right">
                    {t.status === "active" && t.source_invoice_id && (
                      <button
                        onClick={() => setCancelId(t.id)}
                        className="btn-ghost gap-1 text-sm text-destructive"
                        title="Cancel transfer"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-outline"
          >
            Next
          </button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer AP Voucher</DialogTitle>
            <DialogDescription>Select an unpaid voucher. Its full outstanding balance will be transferred, with linked source and destination records.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="doc_date" className="label-text">Transfer Date *</label>
                <input
                  id="doc_date"
                  type="date"
                  value={form.doc_date}
                  onChange={(e) => setForm((f) => ({ ...f, doc_date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="amount" className="label-text">Full outstanding balance {selectedVoucher?.currency}</label>
                <input
                  id="amount"
                  type="text"
                  value={selectedVoucher ? formatNumber(Number(selectedVoucher.balance)) : "—"}
                  readOnly
                  className="input-field bg-muted text-right tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="from_vendor_id" className="label-text">From Vendor (Source) *</label>
              <select
                id="from_vendor_id"
                value={form.from_vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, from_vendor_id: e.target.value, source_invoice_id: "", to_vendor_id: "" }))}
                className="input-field"
                required
              >
                <option value="">Select source vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.name_th || v.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="source_invoice_id" className="label-text">Source AP Voucher *</label>
              <select id="source_invoice_id" value={form.source_invoice_id}
                onChange={(e) => setForm((f) => ({ ...f, source_invoice_id: e.target.value }))}
                className="input-field" required disabled={!form.from_vendor_id || voucherLoading}>
                <option value="">{voucherLoading ? "Loading vouchers…" : "Select an AP voucher…"}</option>
                {vouchers.map((voucher) => <option key={voucher.id} value={voucher.id}>{voucher.doc_number} · {formatDate(voucher.doc_date)} · {formatNumber(Number(voucher.balance))} {voucher.currency}</option>)}
              </select>
              {voucherError && <p role="alert" className="text-sm text-destructive">{voucherError}</p>}
              {form.from_vendor_id && !voucherLoading && !voucherError && vouchers.length === 0 && <p className="text-sm text-muted-foreground">No eligible unpaid vouchers for this vendor.</p>}
              {selectedVoucher && <p className="text-xs text-muted-foreground">Invoice: {selectedVoucher.inv_number || "—"} · Due: {selectedVoucher.due_date ? formatDate(selectedVoucher.due_date) : "—"} · <Link className="text-primary hover:underline" href={`/postings/${selectedVoucher.id}`}>View voucher</Link></p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="to_vendor_id" className="label-text">To Vendor (Destination) *</label>
              <select
                id="to_vendor_id"
                value={form.to_vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, to_vendor_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select destination vendor...</option>
                {vendors.filter((v) => v.id !== form.from_vendor_id).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.name_th || v.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="remark" className="label-text">Transfer reason *</label>
              <textarea
                id="remark"
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                className="input-field min-h-[80px]"
                rows={2}
                required
                maxLength={500}
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving || voucherLoading || !selectedVoucher || !form.to_vendor_id || !form.remark.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Transfer</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this transfer? The destination and adjustment vouchers will be cancelled, and the source balance restored. Cancellation is blocked if the destination is already used or the transfer period is closed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setCancelId(null)} className="btn-outline">No, Keep It</button>
            <button onClick={handleCancel} className="btn-destructive" disabled={cancelLoading}>
              {cancelLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, Cancel Transfer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
