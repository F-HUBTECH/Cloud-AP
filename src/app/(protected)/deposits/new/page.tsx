"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDeposit } from "@/modules/deposit/deposit.actions";
import type { DepositFormData } from "@/modules/deposit/deposit.types";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface VendorOption {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
}

export default function NewDepositPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [form, setForm] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    supplier_id: "",
    deposit_amount: "",
    deposit_vat: "",
    po_number: "",
    payment_code: "",
    remark: "",
  });

  useEffect(() => {
    async function fetchVendors() {
      const supabase = createClient();
      const { data } = await supabase
        .from("vendors")
        .select("id, code, name_en, name_th")
        .eq("is_active", true)
        .order("code");
      if (data) setVendors(data as VendorOption[]);
    }
    fetchVendors();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const selectedVendor = vendors.find((v) => v.id === form.supplier_id);
      if (!selectedVendor) {
        setError("Please select a vendor");
        return;
      }

      const depositAmount = parseFloat(form.deposit_amount) || 0;
      const depositVat = parseFloat(form.deposit_vat) || 0;

      if (depositAmount <= 0) {
        setError("Deposit amount must be greater than zero");
        return;
      }

      const formData: DepositFormData = {
        depositDate: form.doc_date,
        supplierCode: selectedVendor.code,
        supplierId: selectedVendor.id,
        amount: depositAmount,
        vatAmount: depositVat,
        poNumber: form.po_number || undefined,
        remark: form.remark || undefined,
        payCode: form.payment_code || undefined,
        items: [],
      };

      const result = await createDeposit(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create deposit");
        return;
      }

      router.push("/deposits");
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
        <Link href="/deposits" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Deposit Payment</h1>
          <p className="text-muted-foreground">Create a new deposit payment to a vendor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Deposit Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="doc_date" className="label-text">
                Deposit Date *
              </label>
              <input
                id="doc_date"
                type="date"
                value={form.doc_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, doc_date: e.target.value }))
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
                value={form.supplier_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplier_id: e.target.value }))
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
              <label htmlFor="deposit_amount" className="label-text">
                Deposit Amount *
              </label>
              <input
                id="deposit_amount"
                type="number"
                step="0.01"
                value={form.deposit_amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deposit_amount: e.target.value }))
                }
                className="input-field text-right"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="deposit_vat" className="label-text">
                Deposit VAT
              </label>
              <input
                id="deposit_vat"
                type="number"
                step="0.01"
                value={form.deposit_vat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deposit_vat: e.target.value }))
                }
                className="input-field text-right"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="po_number" className="label-text">
                PO Number
              </label>
              <input
                id="po_number"
                value={form.po_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, po_number: e.target.value }))
                }
                className="input-field"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="payment_code" className="label-text">
                Payment Code
              </label>
              <input
                id="payment_code"
                value={form.payment_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payment_code: e.target.value }))
                }
                className="input-field"
                maxLength={10}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label htmlFor="remark" className="label-text">
              Remark
            </label>
            <textarea
              id="remark"
              value={form.remark}
              onChange={(e) =>
                setForm((f) => ({ ...f, remark: e.target.value }))
              }
              className="input-field min-h-[80px]"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/deposits" className="btn-outline">
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
                Create Deposit
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}