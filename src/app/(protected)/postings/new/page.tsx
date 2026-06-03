"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/format";
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react";
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

interface LineItem {
  line_no: number;
  gl_account: string;
  description: string;
  dr_amount: number;
  cr_amount: number;
}

export default function NewVoucherPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [header, setHeader] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    supplier_id: "",
    inv_number: "",
    inv_date: "",
    due_date: "",
    remark: "",
    ap_type_code: "",
    vat_type: "none",
    wht_code: "",
  });

  const [lines, setLines] = useState<LineItem[]>([
    { line_no: 1, gl_account: "", description: "", dr_amount: 0, cr_amount: 0 },
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
    }
    fetchVendors();
  }, []);

  const totalDr = lines.reduce((sum, l) => sum + (l.dr_amount || 0), 0);
  const totalCr = lines.reduce((sum, l) => sum + (l.cr_amount || 0), 0);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      {
        line_no: prev.length + 1,
        gl_account: "",
        description: "",
        dr_amount: 0,
        cr_amount: 0,
      },
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

      const selectedVendor = vendors.find((v) => v.id === header.supplier_id);
      if (!selectedVendor) {
        setError("Please select a vendor");
        return;
      }

      if (Math.abs(totalDr - totalCr) > 0.01) {
        setError("Total Debit must equal Total Credit");
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
        (header.doc_date && selectedVendor.credit_term
          ? new Date(
              new Date(header.doc_date).getTime() +
                selectedVendor.credit_term * 86400000
            )
              .toISOString()
              .slice(0, 10)
          : header.doc_date);

      const { error: invoiceError } = await supabase.from("invoices").insert({
        doc_number: docNumber,
        doc_date: header.doc_date,
        supplier_code: selectedVendor.code,
        supplier_id: selectedVendor.id,
        inv_number: header.inv_number || null,
        inv_date: header.inv_date || null,
        due_date: dueDate || null,
        remark: header.remark || null,
        ap_type_code: header.ap_type_code || null,
        vat_type: header.vat_type,
        wht_code: header.wht_code || null,
        total_no_vat: totalDr,
        total_amount: totalDr,
        balance: totalDr,
        status: "draft",
        created_by: user.id,
        updated_by: user.id,
      });

      if (invoiceError) {
        setError(invoiceError.message);
        return;
      }

      const { data: insertedInvoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("doc_number", docNumber)
        .single();

      if (insertedInvoice && lines.length > 0) {
        const items = lines
          .filter((l) => l.description || l.dr_amount || l.cr_amount)
          .map((l, i) => ({
            invoice_id: insertedInvoice.id,
            line_no: i + 1,
            gl_account: l.gl_account || null,
            description: l.description || null,
            dr_amount: l.dr_amount,
            cr_amount: l.cr_amount,
            total_no_vat: l.dr_amount || l.cr_amount,
          }));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/postings" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New AP Voucher</h1>
          <p className="text-muted-foreground">Create a new invoice voucher</p>
        </div>
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
                Document Date *
              </label>
              <input
                id="doc_date"
                type="date"
                value={header.doc_date}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, doc_date: e.target.value }))
                }
                className="input-field"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="supplier_id" className="label-text">
                Vendor *
              </label>
              <select
                id="supplier_id"
                value={header.supplier_id}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, supplier_id: e.target.value }))
                }
                className="input-field"
                required
              >
                <option value="">Select a vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.name_th || v.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="inv_number" className="label-text">
                Invoice Number
              </label>
              <input
                id="inv_number"
                value={header.inv_number}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, inv_number: e.target.value }))
                }
                className="input-field"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="inv_date" className="label-text">
                Invoice Date
              </label>
              <input
                id="inv_date"
                type="date"
                value={header.inv_date}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, inv_date: e.target.value }))
                }
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="due_date" className="label-text">
                Due Date
              </label>
              <input
                id="due_date"
                type="date"
                value={header.due_date}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, due_date: e.target.value }))
                }
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="vat_type" className="label-text">
                VAT Type
              </label>
              <select
                id="vat_type"
                value={header.vat_type}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, vat_type: e.target.value }))
                }
                className="input-field"
              >
                <option value="none">No VAT</option>
                <option value="exclusive">Exclusive</option>
                <option value="inclusive">Inclusive</option>
                <option value="exempt">Exempt</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="ap_type_code" className="label-text">
                AP Type
              </label>
              <input
                id="ap_type_code"
                value={header.ap_type_code}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, ap_type_code: e.target.value }))
                }
                className="input-field"
                maxLength={5}
                placeholder="e.g. N, S"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="wht_code" className="label-text">
                WHT Code
              </label>
              <input
                id="wht_code"
                value={header.wht_code}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, wht_code: e.target.value }))
                }
                className="input-field"
                maxLength={5}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label htmlFor="remark" className="label-text">
              Remark
            </label>
            <textarea
              id="remark"
              value={header.remark}
              onChange={(e) =>
                setHeader((h) => ({ ...h, remark: e.target.value }))
              }
              className="input-field min-h-[80px]"
              rows={2}
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b p-4">
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
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="text-center text-muted-foreground">
                      {line.line_no}
                    </td>
                    <td>
                      <input
                        value={line.gl_account}
                        onChange={(e) =>
                          updateLine(index, "gl_account", e.target.value)
                        }
                        className="input-field"
                        placeholder="GL Account"
                        maxLength={20}
                      />
                    </td>
                    <td>
                      <input
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, "description", e.target.value)
                        }
                        className="input-field"
                        placeholder="Description"
                        maxLength={200}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={line.dr_amount || ""}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "dr_amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="input-field text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={line.cr_amount || ""}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "cr_amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
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
                <tr className="border-t-2 font-semibold">
                  <td colSpan={3} className="text-right">
                    Total
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(totalDr)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(totalCr)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {Math.abs(totalDr - totalCr) > 0.01 && (
            <div className="border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
              Debit and Credit totals must be equal (difference:{" "}
              {formatCurrency(Math.abs(totalDr - totalCr))})
            </div>
          )}
        </div>

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
                Create Voucher
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}