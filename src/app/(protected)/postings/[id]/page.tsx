"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  XCircle,
  Pencil,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { SubmitApprovalButton } from "./submit-approval-button";

interface InvoiceDetail {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  supplier_name: string | null;
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

interface VendorOption {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
}

interface GlAccountOption {
  code: string;
  name: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  posted: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

const CAN_EDIT = ["draft"];
const CAN_CANCEL = ["draft", "pending_approval", "approved"];

export default function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccountOption[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [header, setHeader] = useState({
    doc_date: "",
    supplier_id: "",
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
      const { data: supplier } = await supabase
        .from("vendors")
        .select("name_en, name_th")
        .eq("id", inv.supplier_id)
        .maybeSingle();

      const detail: InvoiceDetail = {
        ...inv,
        supplier_name: supplier?.name_th || supplier?.name_en || null,
        total_no_vat: Number(inv.total_no_vat) || 0,
        total_amount: Number(inv.total_amount) || 0,
        balance: Number(inv.balance) || 0,
      };
      setInvoice(detail);
      setHeader({
        doc_date: detail.doc_date ?? "",
        supplier_id: detail.supplier_id,
        inv_number: detail.inv_number ?? "",
        inv_date: detail.inv_date ?? "",
        due_date: detail.due_date ?? "",
        remark: detail.remark ?? "",
        ap_type_code: detail.ap_type_code ?? "",
        vat_type: detail.vat_type ?? "none",
        wht_code: detail.wht_code ?? "",
      });
      setIsEditing(false);
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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("vendors")
      .select("id, code, name_en, name_th")
      .order("code")
      .then(({ data }) => setVendors((data ?? []) as VendorOption[]));
    supabase
      .from("gl_accounts")
      .select("code, name")
      .eq("is_active", true)
      .eq("account_type", "detail")
      .order("code")
      .then(({ data }) => setGlAccounts((data ?? []) as GlAccountOption[]));
  }, []);

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
      return prev
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, line_no: i + 1 }));
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
      const { data: { user } } = await supabase.auth.getUser();
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
          supplier_id: header.supplier_id || invoice.supplier_id,
          supplier_code:
            vendors.find((vendor) => vendor.id === header.supplier_id)?.code ??
            invoice.supplier_code,
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
        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(items);
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

  async function handleCancel() {
    const reason = prompt("Enter reason for cancellation:");
    if (!reason?.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const { cancelVoucher } = await import(
        "@/modules/posting/posting.actions"
      );
      const result = await cancelVoucher(id, reason);
      if (result.success) {
        router.push("/postings");
      } else {
        setError(result.error ?? "Failed to cancel voucher");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel voucher"
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!invoice) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <h1 className="text-lg font-semibold">Voucher not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This voucher may have been deleted or the link is invalid.
        </p>
        <Link href="/postings" className="btn-outline mt-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Vouchers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/postings" className="btn-ghost mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {invoice.doc_number}
              </h1>
              <span
                className={cn(
                  "badge",
                  STATUS_BADGE[invoice.status] ?? "badge-info"
                )}
              >
                {invoice.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.supplier_code}
              {invoice.inv_number && <span> · Inv. {invoice.inv_number}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "draft" && !isEditing && (
            <SubmitApprovalButton invoiceId={invoice.id} onSubmitted={fetchInvoice} />
          )}
          {invoice.status === "approved" && !isEditing && (
            <Link href={`/payments/assign/${invoice.supplier_id}`} className="btn-primary">
              Create Payment
            </Link>
          )}
          {CAN_EDIT.includes(invoice.status) && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-outline"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                fetchInvoice();
              }}
              className="btn-ghost"
            >
              Cancel Edit
            </button>
          )}
          {CAN_CANCEL.includes(invoice.status) && !isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn-destructive"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel Voucher
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Info + Summary grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Header Info */}
          <div className="card p-6 lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Voucher Header
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isEditing ? (
                <>
                  <Field label="Document Date">
                    <input
                      type="date"
                      value={header.doc_date}
                      onChange={(e) =>
                        setHeader((h) => ({ ...h, doc_date: e.target.value }))
                      }
                      className="input-field"
                    />
                  </Field>
                  <Field label="Supplier">
                    <select
                      value={header.supplier_id}
                      onChange={(e) =>
                        setHeader((h) => ({ ...h, supplier_id: e.target.value }))
                      }
                      className="input-field"
                    >
                      <option value="">Select supplier</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.code} — {vendor.name_th || vendor.name_en}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <InfoItem label="Document Date" value={formatDate(invoice.doc_date)} />
                  <InfoItem
                    label="Supplier"
                    value={`${invoice.supplier_code}${invoice.supplier_name ? ` — ${invoice.supplier_name}` : ""}`}
                  />
                </>
              )}
              {isEditing ? (
                <Field label="Invoice Number">
                  <input value={header.inv_number} onChange={(e) => setHeader((h) => ({ ...h, inv_number: e.target.value }))} className="input-field" maxLength={30} />
                </Field>
              ) : (
                <InfoItem label="Invoice Number" value={invoice.inv_number} />
              )}
              {isEditing ? (
                <Field label="Invoice Date">
                  <input type="date" value={header.inv_date} onChange={(e) => setHeader((h) => ({ ...h, inv_date: e.target.value }))} className="input-field" />
                </Field>
              ) : (
                <InfoItem label="Invoice Date" value={invoice.inv_date ? formatDate(invoice.inv_date) : null} />
              )}
              {isEditing ? (
                <Field label="Due Date">
                  <input type="date" value={header.due_date} onChange={(e) => setHeader((h) => ({ ...h, due_date: e.target.value }))} className="input-field" />
                </Field>
              ) : (
                <InfoItem label="Due Date" value={invoice.due_date ? formatDate(invoice.due_date) : null} />
              )}
              {isEditing ? (
                <Field label="VAT Type">
                  <select value={header.vat_type} onChange={(e) => setHeader((h) => ({ ...h, vat_type: e.target.value }))} className="input-field">
                    <option value="none">No VAT</option>
                    <option value="exclusive">Exclusive</option>
                    <option value="inclusive">Inclusive</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </Field>
              ) : (
                <InfoItem label="VAT Type" value={invoice.vat_type} />
              )}
              {isEditing ? (
                <>
                  <Field label="AP Type">
                    <input value={header.ap_type_code} onChange={(e) => setHeader((h) => ({ ...h, ap_type_code: e.target.value }))} className="input-field" maxLength={5} />
                  </Field>
                  <Field label="WHT Code">
                    <input value={header.wht_code} onChange={(e) => setHeader((h) => ({ ...h, wht_code: e.target.value }))} className="input-field" maxLength={5} />
                  </Field>
                </>
              ) : (
                <>
                  <InfoItem label="AP Type" value={invoice.ap_type_code} />
                  <InfoItem label="WHT Code" value={invoice.wht_code} />
                </>
              )}
            </div>
            {isEditing ? (
              <Field label="Remark">
                <textarea value={header.remark} onChange={(e) => setHeader((h) => ({ ...h, remark: e.target.value }))} className="input-field min-h-[80px]" rows={2} />
              </Field>
            ) : invoice.remark ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Remark</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">{invoice.remark}</p>
              </div>
            ) : null}
          </div>

          {/* Summary */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Summary</h2>
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  invoice.balance > 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {formatCurrency(invoice.balance)}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">{formatDate(invoice.created_at, "dd/MM/yyyy HH:mm")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm">{formatDate(invoice.updated_at, "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="font-semibold">Detail Lines</h2>
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
                    <td className="text-center text-muted-foreground">
                      {line.line_no}
                    </td>
                    {isEditing ? (
                      <>
                        <td>
                          <input value={line.gl_account} onChange={(e) => updateLine(index, "gl_account", e.target.value)} className="input-field" placeholder="GL Account" maxLength={20} list="gl-account-options" />
                        </td>
                        <td>
                          <input value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} className="input-field" placeholder="Description" maxLength={200} />
                        </td>
                        <td>
                          <input type="number" step="0.01" value={line.dr_amount || ""} onChange={(e) => updateLine(index, "dr_amount", parseFloat(e.target.value) || 0)} className="input-field text-right" placeholder="0.00" />
                        </td>
                        <td>
                          <input type="number" step="0.01" value={line.cr_amount || ""} onChange={(e) => updateLine(index, "cr_amount", parseFloat(e.target.value) || 0)} className="input-field text-right" placeholder="0.00" />
                        </td>
                        <td>
                          {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(index)} className="btn-ghost text-destructive p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="font-medium">{line.gl_account || "—"}</td>
                        <td className="text-muted-foreground">{line.description || "—"}</td>
                        <td className="text-right tabular-nums">{formatCurrency(line.dr_amount)}</td>
                        <td className="text-right tabular-nums">{formatCurrency(line.cr_amount)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold bg-muted/50">
                  <td colSpan={isEditing ? 3 : 3} className="text-right pr-4">
                    Total
                  </td>
                  <td className={cn("text-right tabular-nums", totalDr > 0 && "text-success")}>
                    {formatCurrency(totalDr)}
                  </td>
                  <td className={cn("text-right tabular-nums", totalCr > 0 && "text-success")}>
                    {formatCurrency(totalCr)}
                  </td>
                  {isEditing && <td />}
                </tr>
              </tfoot>
            </table>
            <datalist id="gl-account-options">
              {glAccounts.map((account) => (
                <option key={account.code} value={account.code}>
                  {account.code} — {account.name}
                </option>
              ))}
            </datalist>
          </div>
          {isEditing && Math.abs(totalDr - totalCr) > 0.01 && (
            <div className="border-t bg-destructive/5 px-6 py-3 text-sm text-destructive">
              Debit and Credit totals must be equal. Difference:{" "}
              {formatCurrency(Math.abs(totalDr - totalCr))}
            </div>
          )}
        </div>

        {/* Edit actions */}
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
      </form>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display = value != null && value !== "" ? String(value) : "—";
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{display}</dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label-text">{label}</label>
      {children}
    </div>
  );
}
