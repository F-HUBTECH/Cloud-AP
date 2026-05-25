"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [form, setForm] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    from_vendor_id: "",
    to_vendor_id: "",
    amount: "",
    remark: "",
  });

  const supabase = createClient();
  const pageSize = 20;

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("transfers")
      .select("*, from_vendor:vendors!transfers_from_vendor_id_fkey(code, name_en, name_th), to_vendor:vendors!transfers_to_vendor_id_fkey(code, name_en, name_th)", { count: "exact" })
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
  }, [page, search, statusFilter]);

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase
      .from("vendors")
      .select("id, code, name_en, name_th")
      .eq("is_active", true)
      .order("code");
    if (data) setVendors(data as VendorOption[]);
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const amount = parseFloat(form.amount) || 0;

      const formData = {
        doc_date: form.doc_date,
        from_vendor_id: form.from_vendor_id,
        to_vendor_id: form.to_vendor_id,
        amount,
        ...(form.remark ? { remark: form.remark } : {}),
      };

      const result = await createTransfer(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create transfer");
        return;
      }

      setDialogOpen(false);
      setForm({
        doc_date: new Date().toISOString().slice(0, 10),
        from_vendor_id: "",
        to_vendor_id: "",
        amount: "",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Transfers</h1>
          <p className="text-muted-foreground">Transfer AP balance between vendors</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Transfer
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
              <th>Date</th>
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
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  No transfers found
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.doc_number}</td>
                  <td>{formatDate(t.transfer_date)}</td>
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
                    {t.status === "active" && (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Vendor Transfer</DialogTitle>
            <DialogDescription>Transfer AP balance from one vendor to another</DialogDescription>
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
                <label htmlFor="amount" className="label-text">Amount *</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input-field text-right"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="from_vendor_id" className="label-text">From Vendor (Source) *</label>
              <select
                id="from_vendor_id"
                value={form.from_vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, from_vendor_id: e.target.value }))}
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
              <label htmlFor="to_vendor_id" className="label-text">To Vendor (Destination) *</label>
              <select
                id="to_vendor_id"
                value={form.to_vendor_id}
                onChange={(e) => setForm((f) => ({ ...f, to_vendor_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select destination vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.name_th || v.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="remark" className="label-text">Remark</label>
              <textarea
                id="remark"
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                className="input-field min-h-[80px]"
                rows={2}
                maxLength={500}
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
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
              Are you sure you want to cancel this transfer? The vendor balances will be reversed.
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