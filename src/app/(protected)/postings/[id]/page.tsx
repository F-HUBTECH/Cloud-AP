"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, Save, Plus, Trash2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

interface InvoiceDetail {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  inv_number: string | null;
  inv_date: string | null;
  due_date: string | null;
  remark: string | null;
  ap_type_code: string | null;
  vat_type: string;
  wht_code: string | null;
  total_no_vat: number;
  total_amount: number;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LineItem {
  id?: string;
  line_no: number;
  gl_account: string;
  description: string;
  dr_amount: number;
  cr_amount: number;
}

const statusColorMap: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  posted: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

export default function VoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [header, setHeader] = useState({
    doc_date: "",
    inv_number: "",
    inv_date: "",
    due_date: "",
    remark: "",
    ap_type_code: "",
    vat_type: "none",
    wht_code: "",
  });

  const [lines, setLines] = useState<LineItem[]>([]);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    const supabase = createClient();

    const { data: inv } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (inv) {
      const detail: InvoiceDetail = {
        ...inv,
        total_no_vat: Number(inv.total_no_vat) || 0,
        total_amount: Number(inv.total_amount) || 0,
        balance: Number(inv.balance) || 0,
      };
      setInvoice(detail);
      setHeader({
        doc_date: detail.doc_date ?? "",
        inv_number: detail.inv_number ?? "",
        inv_date: detail.inv_date ?? "",
        due_date: detail.due_date ?? "",
        remark: detail.remark ?? "",
        ap_type_code: detail.ap_type_code ?? "",
        vat_type: detail.vat_type ?? "none",
        wht_code: detail.wht_code ?? "",
      });
      setIsEditing(detail.status === "draft");
    }

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("line_no");

    if (items && items.length > 0) {
      setLines(
        items.map((it: Record<string, unknown>) => ({
          id: String(it.id),
          line_no: Number(it.line_no) || 0,
          gl_account: (it.gl_account as string) ?? "",
          description: (it.description as string) ?? "",
          dr_amount: Number(it.dr_amount) || 0,
          cr_amount: Number(it.cr_amount) || 0,
        }))
      );
    } else {
      setLines([
        { line_no: 1, gl_account: "", description: "", dr_amount: 0, cr_amount: 0 },
      ]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const totalDr = lines.reduce((sum, l) => sum + (l.dr_amount || 0), 0);
  const totalCr = lines.reduce((sum, l) => sum + (l.cr_amount || 0), 0);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      { line_no: prev.length + 1, gl_account: "", description: "", dr_amount: 0, cr_amount: 0 },
    ]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_no: i + 1 }));
    });
  }, []);

  function updateLine(index: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    setError(null);
    setIsSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Authentication required");
        return;
      }

      if (Math.abs(totalDr - totalCr) > 0.01) {
        setError("Total Debit must equal Total Credit");
        return;
      }

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          doc_date: header.doc_date || invoice.doc_date,
          inv_number: header.inv_number || null,
          inv_date: header.inv_date || null,
          due_date: header.due_date || null,
          remark: header.remark || null,
          ap_type_code: header.ap_type_code || null,
          vat_type: header.vat_type,
          wht_code: header.wht_code || null,
          total_no_vat: totalDr,
          total_amount: totalDr,
          updated_by: user.id,
        })
        .eq("id", invoice.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      const items = lines
        .filter((l) => l.description || l.dr_amount || l.cr_amount)
        .map((l, i) => ({
          invoice_id: invoice.id,
          line_no: i + 1,
          gl_account: l.gl_account || null,
          description: l.description || null,
          dr_amount: l.dr_amount,
          cr_amount: l.cr_amount,
          total_no_vat: l.dr_amount || l.cr_amount,
        }));

      await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("invoice_items").insert(items);
        if (itemsError) {
          setError(itemsError.message);
          return;
        }
      }

      router.push("/postings");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/postings" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Voucher not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/postings" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Voucher {invoice.doc_number}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Edit voucher" : "Voucher detail view"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "badge",
            statusColorMap[invoice.status] ?? "badge-info"
          )}
        >
          {invoice.status.replace(/_/g, " ")}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Header Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="doc_date" className="label-text">
                Document Date
              </label>
              {isEditing ? (
                <input
                  id="doc_date"
                  type="date"
                  value={header.doc_date}
                  onChange={(e) => setHeader((h) => ({ ...h, doc_date: e.target.value }))}
                  className="input-field"
                />
              ) : (
                <p className="font-medium">{formatDate(invoice.doc_date)}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="label-text">Supplier</label>
              <p className="font-medium">{invoice.supplier_code}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="inv_number" className="label-text">
                Invoice Number
              </label>
              {isEditing ? (
                <input
                  id="inv_number"
                  value={header.inv_number}
                  onChange={(e) => setHeader((h) => ({ ...h, inv_number: e.target.value }))}
                  className="input-field"
                  maxLength={30}
                />
              ) : (
                <p className="font-medium">{invoice.inv_number ?? "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="inv_date" className="label-text">
                Invoice Date
              </label>
              {isEditing ? (
                <input
                  id="inv_date"
                  type="date"
                  value={header.inv_date}
                  onChange={(e) => setHeader((h) => ({ ...h, inv_date: e.target.value }))}
                  className="input-field"
                />
              ) : (
                <p className="font-medium">
                  {invoice.inv_date ? formatDate(invoice.inv_date) : "-"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="due_date" className="label-text">
                Due Date
              </label>
              {isEditing ? (
                <input
                  id="due_date"
                  type="date"
                  value={header.due_date}
                  onChange={(e) => setHeader((h) => ({ ...h, due_date: e.target.value }))}
                  className="input-field"
                />
              ) : (
                <p className="font-medium">
                  {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="vat_type" className="label-text">
                VAT Type
              </label>
              {isEditing ? (
                <select
                  id="vat_type"
                  value={header.vat_type}
                  onChange={(e) => setHeader((h) => ({ ...h, vat_type: e.target.value }))}
                  className="input-field"
                >
                  <option value="none">No VAT</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                  <option value="exempt">Exempt</option>
                </select>
              ) : (
                <p className="font-medium">{invoice.vat_type}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="ap_type_code" className="label-text">AP Type</label>
              {isEditing ? (
                <input
                  id="ap_type_code"
                  value={header.ap_type_code}
                  onChange={(e) => setHeader((h) => ({ ...h, ap_type_code: e.target.value }))}
                  className="input-field"
                  maxLength={5}
                />
              ) : (
                <p className="font-medium">{invoice.ap_type_code ?? "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="wht_code" className="label-text">WHT Code</label>
              {isEditing ? (
                <input
                  id="wht_code"
                  value={header.wht_code}
                  onChange={(e) => setHeader((h) => ({ ...h, wht_code: e.target.value }))}
                  className="input-field"
                  maxLength={5}
                />
              ) : (
                <p className="font-medium">{invoice.wht_code ?? "-"}</p>
              )}
            </div>
          </div>
          {isEditing && (
            <div className="mt-4 space-y-2">
              <label htmlFor="remark" className="label-text">Remark</label>
              <textarea
                id="remark"
                value={header.remark}
                onChange={(e) => setHeader((h) => ({ ...h, remark: e.target.value }))}
                className="input-field min-h-[80px]"
                rows={2}
              />
            </div>
          )}
          {!isEditing && invoice.remark && (
            <div className="mt-4">
              <span className="label-text text-muted-foreground">Remark</span>
              <p className="mt-1">{invoice.remark}</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Detail Lines</h2>
            {isEditing && (
              <button type="button" onClick={addLine} className="btn-outline text-sm">
                <Plus className="h-4 w-4" />
                Add Line
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>GL Account</th>
                  <th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  {isEditing && <th className="w-12" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id ?? index}>
                    <td className="text-center text-muted-foreground">{line.line_no}</td>
                    <td>
                      {isEditing ? (
                        <input
                          value={line.gl_account}
                          onChange={(e) => updateLine(index, "gl_account", e.target.value)}
                          className="input-field"
                          placeholder="GL Account"
                          maxLength={20}
                        />
                      ) : (
                        line.gl_account || "-"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(index, "description", e.target.value)}
                          className="input-field"
                          placeholder="Description"
                          maxLength={200}
                        />
                      ) : (
                        line.description || "-"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={line.dr_amount || ""}
                          onChange={(e) =>
                            updateLine(index, "dr_amount", parseFloat(e.target.value) || 0)
                          }
                          className="input-field text-right"
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(line.dr_amount)}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={line.cr_amount || ""}
                          onChange={(e) =>
                            updateLine(index, "cr_amount", parseFloat(e.target.value) || 0)
                          }
                          className="input-field text-right"
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(line.cr_amount)}</span>
                      )}
                    </td>
                    {isEditing && (
                      <td>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="btn-ghost text-destructive p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td colSpan={3} className="text-right">Total</td>
                  <td className="text-right font-mono">{formatCurrency(totalDr)}</td>
                  <td className="text-right font-mono">{formatCurrency(totalCr)}</td>
                  {isEditing && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
          {isEditing && Math.abs(totalDr - totalCr) > 0.01 && (
            <div className="border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
              Debit and Credit totals must be equal (difference:{" "}
              {formatCurrency(Math.abs(totalDr - totalCr))})
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Summary</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="label-text text-muted-foreground">Total Amount</span>
                <p className="mt-1 font-mono text-lg font-medium">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
              <div>
                <span className="label-text text-muted-foreground">Balance</span>
                <p className="mt-1 font-mono text-lg font-medium">
                  {formatCurrency(invoice.balance)}
                </p>
              </div>
              <div>
                <span className="label-text text-muted-foreground">Status</span>
                <p className="mt-1">
                  <span
                    className={cn(
                      "badge",
                      statusColorMap[invoice.status] ?? "badge-info"
                    )}
                  >
                    {invoice.status.replace(/_/g, " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Audit Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label-text text-muted-foreground">Created</span>
                <p className="mt-1 text-sm">
                  {formatDate(invoice.created_at, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              <div>
                <span className="label-text text-muted-foreground">Last Updated</span>
                <p className="mt-1 text-sm">
                  {formatDate(invoice.updated_at, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex justify-end gap-3">
            <Link href="/postings" className="btn-outline">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        {!isEditing && invoice && !["cancelled", "voided", "paid"].includes(invoice.status) && (
          <div className="flex justify-end gap-3">
            <Link href="/postings" className="btn-outline">
              Back
            </Link>
            <button
              type="button"
              onClick={async () => {
                const reason = prompt("Enter reason for cancellation:");
                if (!reason?.trim()) return;
                setIsSaving(true);
                setError(null);
                try {
                  const { cancelVoucher } = await import("@/modules/posting/posting.actions");
                  const result = await cancelVoucher(id, reason);
                  if (result.success) {
                    router.push("/postings");
                  } else {
                    setError(result.error ?? "Failed to cancel voucher");
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to cancel voucher");
                } finally {
                  setIsSaving(false);
                }
              }}
              className="btn-destructive"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel Voucher
            </button>
          </div>
        )}
      </form>
    </div>
  );
}