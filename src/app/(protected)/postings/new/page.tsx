"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Plus,
  Trash2,
  Loader2,
  FileText,
  List,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

interface VendorOption {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
  vat_code: string | null;
  wht_code: string | null;
  wht_percent: number;
  credit_term: number;
}

interface GlAccountOption {
  code: string;
  name: string;
}

interface LineItem {
  line_no: number;
  gl_account: string;
  description: string;
  dr_amount: string;
  cr_amount: string;
}

interface HeaderForm {
  doc_date: string;
  supplier_id: string;
  inv_number: string;
  inv_date: string;
  due_date: string;
  remark: string;
  ap_type_code: string;
  vat_type: string;
  wht_code: string;
}

const STEPS = [
  { id: 1, label: "Header", icon: FileText },
  { id: 2, label: "Lines", icon: List },
  { id: 3, label: "Review", icon: ClipboardList },
] as const;

export default function NewVoucherPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccountOption[]>([]);

  const { register, watch, trigger, getValues } = useForm<HeaderForm>({
    defaultValues: {
      doc_date: new Date().toISOString().slice(0, 10),
      supplier_id: "",
      inv_number: "",
      inv_date: "",
      due_date: "",
      remark: "",
      ap_type_code: "",
      vat_type: "none",
      wht_code: "",
    },
    mode: "onChange",
  });

  const [lines, setLines] = useState<LineItem[]>([
    { line_no: 1, gl_account: "", description: "", dr_amount: "", cr_amount: "" },
  ]);

  useEffect(() => {
    async function fetchVendors() {
      const supabase = createClient();
      const { data } = await supabase
        .from("vendors")
        .select("id, code, name_en, name_th, vat_code, wht_code, wht_percent, credit_term")
        .eq("is_active", true)
        .order("code");
      if (data) setVendors(data as VendorOption[]);
      const { data: accountData } = await supabase
        .from("gl_accounts")
        .select("code, name")
        .eq("is_active", true)
        .eq("account_type", "detail")
        .order("code");
      if (accountData) setGlAccounts(accountData as GlAccountOption[]);
    }
    fetchVendors();
  }, []);

  const selectedVendor = vendors.find((v) => v.id === watch("supplier_id"));

  const lineTotals = lines.reduce(
    (acc, l) => ({
      dr: acc.dr + (parseFloat(l.dr_amount) || 0),
      cr: acc.cr + (parseFloat(l.cr_amount) || 0),
    }),
    { dr: 0, cr: 0 }
  );
  const isBalanced = Math.abs(lineTotals.dr - lineTotals.cr) < 0.01;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        line_no: prev.length + 1,
        gl_account: "",
        description: "",
        dr_amount: "",
        cr_amount: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_no: i + 1 }));
    });
  };

  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await trigger(["doc_date", "supplier_id"]);
      if (!valid) return;
    }
    if (step === 2) {
      if (lines.every((l) => !l.gl_account && !l.description && !parseFloat(l.dr_amount) && !parseFloat(l.cr_amount))) {
        setError("At least one detail line is required");
        return;
      }
      if (!isBalanced) {
        setError(`Debit and Credit totals must be equal (difference: ${formatCurrency(Math.abs(lineTotals.dr - lineTotals.cr))})`);
        return;
      }
    }
    setError(null);
    if (step < 3) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Authentication required");
        return;
      }

      const { data: appUser, error: appUserError } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_uid", user.id)
        .single();

      if (appUserError || !appUser) {
        setError("Your application user profile could not be found");
        return;
      }

      const header = getValues();
      const vendor = vendors.find((v) => v.id === header.supplier_id);
      if (!vendor) {
        setError("Please select a vendor");
        return;
      }

      const { data: docNumberResult } = await supabase.rpc("next_doc_number", {
        p_table: "invoices",
        p_field: "doc_number",
        p_group: "APV",
        p_prefix: "APV",
        p_digits: 5,
      });

      const docNumber = docNumberResult ?? `APV${String(Date.now()).slice(-5)}`;

      const dueDate =
        header.due_date ||
        (header.doc_date && vendor.credit_term
          ? new Date(
              new Date(header.doc_date).getTime() + vendor.credit_term * 86400000
            )
              .toISOString()
              .slice(0, 10)
          : header.doc_date);

      const { data: insertedInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          doc_number: docNumber,
          doc_date: header.doc_date,
          supplier_code: vendor.code,
          supplier_id: vendor.id,
          inv_number: header.inv_number || null,
          inv_date: header.inv_date || null,
          due_date: dueDate || null,
          remark: header.remark || null,
          ap_type_code: header.ap_type_code || null,
          vat_type: header.vat_type,
          wht_code: header.wht_code || null,
          total_no_vat: lineTotals.dr,
          total_amount: lineTotals.dr,
          balance: lineTotals.dr,
          status: "draft",
          created_by: appUser.id,
          updated_by: appUser.id,
        })
        .select("id")
        .single();

      if (invoiceError) {
        setError(invoiceError.message);
        return;
      }

      if (insertedInvoice) {
        const items = lines
          .filter((l) => l.gl_account || l.description || parseFloat(l.dr_amount) || parseFloat(l.cr_amount))
          .map((l, i) => ({
            invoice_id: insertedInvoice.id,
            line_no: i + 1,
            gl_account: l.gl_account || null,
            description: l.description || null,
            dr_amount: parseFloat(l.dr_amount) || 0,
            cr_amount: parseFloat(l.cr_amount) || 0,
            total_no_vat: parseFloat(l.dr_amount) || parseFloat(l.cr_amount) || 0,
          }));

        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from("invoice_items")
            .insert(items);

          if (itemsError) {
            setError(itemsError.message);
            return;
          }
        }
      }

      router.push(insertedInvoice ? `/postings/${insertedInvoice.id}` : "/postings");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/postings" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New AP Voucher</h1>
          <p className="text-sm text-muted-foreground">
            Step {step} of 3 — {STEPS[step - 1].label}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isComplete = step > s.id;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isComplete && "border-border text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isActive && "text-foreground",
                  !isActive && "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("hidden h-0.5 flex-1 sm:block", isComplete ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Step 1: Header */}
        {step === 1 && (
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-semibold">Voucher Header</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="doc_date" className="label-text">Document Date *</label>
                <input id="doc_date" type="date" {...register("doc_date", { required: true })} className="input-field" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="supplier_id" className="label-text">Vendor *</label>
                <select id="supplier_id" {...register("supplier_id", { required: true })} className="input-field" autoFocus>
                  <option value="">Select a vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.code} — {v.name_th || v.name_en}</option>
                  ))}
                </select>
                {selectedVendor && (
                  <p className="text-xs text-muted-foreground">
                    WHT: {selectedVendor.wht_code || "—"} · VAT: {selectedVendor.vat_code || "—"} · Credit: {selectedVendor.credit_term} days
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="inv_number" className="label-text">Invoice Number</label>
                <input id="inv_number" {...register("inv_number")} className="input-field" maxLength={30} />
              </div>
              <div className="space-y-2">
                <label htmlFor="inv_date" className="label-text">Invoice Date</label>
                <input id="inv_date" type="date" {...register("inv_date")} className="input-field" />
              </div>
              <div className="space-y-2">
                <label htmlFor="due_date" className="label-text">Due Date</label>
                <input id="due_date" type="date" {...register("due_date")} className="input-field" />
              </div>
              <div className="space-y-2">
                <label htmlFor="vat_type" className="label-text">VAT Type</label>
                <select id="vat_type" {...register("vat_type")} className="input-field">
                  <option value="none">No VAT</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                  <option value="exempt">Exempt</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="ap_type_code" className="label-text">AP Type</label>
                <input id="ap_type_code" {...register("ap_type_code")} className="input-field" maxLength={5} placeholder="e.g. N, S" />
              </div>
              <div className="space-y-2">
                <label htmlFor="wht_code" className="label-text">WHT Code</label>
                <input id="wht_code" {...register("wht_code")} className="input-field" maxLength={5} />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="remark" className="label-text">Remark</label>
              <textarea id="remark" {...register("remark")} className="input-field min-h-[80px]" rows={2} />
            </div>
          </div>
        )}

        {/* Step 2: Detail Lines */}
        {step === 2 && (
          <div className="card space-y-0">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Detail Lines</h2>
              <button type="button" onClick={addLine} className="btn-outline text-sm">
                <Plus className="h-4 w-4" />
                Add Line
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>GL Account</th>
                    <th>Description</th>
                    <th className="text-right w-32">Debit</th>
                    <th className="text-right w-32">Credit</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td className="text-center text-muted-foreground">{line.line_no}</td>
                      <td>
                        <input
                          value={line.gl_account}
                          onChange={(e) => updateLine(index, "gl_account", e.target.value)}
                          className="input-field"
                          placeholder="GL Account"
                          maxLength={20}
                          list="gl-account-options"
                        />
                      </td>
                      <td>
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(index, "description", e.target.value)}
                          className="input-field"
                          placeholder="Description"
                          maxLength={200}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.dr_amount}
                          onChange={(e) => updateLine(index, "dr_amount", e.target.value)}
                          className="input-field text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.cr_amount}
                          onChange={(e) => updateLine(index, "cr_amount", e.target.value)}
                          className="input-field text-right"
                          placeholder="0.00"
                        />
                      </td>
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
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-muted/50">
                    <td colSpan={3} className="text-right pr-4">Total</td>
                    <td className={cn("text-right tabular-nums", lineTotals.dr > 0 && "text-success")}>
                      {formatCurrency(lineTotals.dr)}
                    </td>
                    <td className={cn("text-right tabular-nums", lineTotals.cr > 0 && "text-success")}>
                      {formatCurrency(lineTotals.cr)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <datalist id="gl-account-options">
              {glAccounts.map((account) => (
                <option key={account.code} value={account.code}>
                  {account.code} — {account.name}
                </option>
              ))}
            </datalist>
            {!isBalanced && lineTotals.dr > 0 && (
              <div className="border-t bg-destructive/5 px-6 py-3 text-sm text-destructive">
                Debit and Credit totals must be equal. Difference: {formatCurrency(Math.abs(lineTotals.dr - lineTotals.cr))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-semibold">Review &amp; Confirm</h2>
            <p className="text-sm text-muted-foreground">Please review the voucher before creating.</p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ReviewField label="Document Date" value={watch("doc_date")} />
              <ReviewField label="Vendor" value={selectedVendor ? `${selectedVendor.code} — ${selectedVendor.name_th || selectedVendor.name_en}` : "—"} span />
              <ReviewField label="Invoice Number" value={watch("inv_number")} />
              <ReviewField label="Invoice Date" value={watch("inv_date")} />
              <ReviewField label="Due Date" value={watch("due_date") || (watch("doc_date") && selectedVendor ? new Date(new Date(watch("doc_date")).getTime() + (selectedVendor.credit_term || 0) * 86400000).toISOString().slice(0, 10) : watch("doc_date"))} />
              <ReviewField label="VAT Type" value={watch("vat_type")} />
              <ReviewField label="AP Type" value={watch("ap_type_code")} />
              <ReviewField label="WHT Code" value={watch("wht_code")} />
              <ReviewField label="Remark" value={watch("remark")} />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">Line Items</h3>
              <div className="text-sm space-y-1">
                {lines.filter((l) => l.gl_account || l.description || parseFloat(l.dr_amount) || parseFloat(l.cr_amount)).map((l) => (
                  <div key={l.line_no} className="flex justify-between text-muted-foreground">
                    <span>{l.line_no}. {l.gl_account || "(no account)"} — {l.description || "(no description)"}</span>
                    <span className="tabular-nums">
                      Dr: {formatCurrency(parseFloat(l.dr_amount) || 0)} / Cr: {formatCurrency(parseFloat(l.cr_amount) || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t font-semibold text-sm">
                <span>Totals</span>
                <span className="tabular-nums">Dr: {formatCurrency(lineTotals.dr)} = Cr: {formatCurrency(lineTotals.cr)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {step > 1 && (
              <button type="button" onClick={handleBack} className="btn-outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/postings" className="btn-ghost">Cancel</Link>
            {step < 3 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} className="btn-primary" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Voucher
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function ReviewField({ label, value, span }: { label: string; value: string | number | null | undefined; span?: boolean }) {
  const display = value != null && value !== "" ? String(value) : "—";
  return (
    <div className={cn(span && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{display}</dd>
    </div>
  );
}
