"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createVendor } from "@/modules/vendor/vendor.actions";
import Link from "next/link";

export default function NewVendorPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    name_en: "",
    name_th: "",
    address_line1: "",
    address_line2: "",
    address_line3: "",
    city: "",
    country: "",
    zip_code: "",
    tel: "",
    fax: "",
    email: "",
    attn: "",
    remark: "",
    vendor_type: "N",
    tax_id: "",
    card_id: "",
    tax_percent: 0,
    wht_percent: 0,
    credit_term: 0,
    wht_card_type: "company",
    is_active: true,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value) || 0
          : type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const result = await createVendor({
        code: form.code,
        name_en: form.name_en,
        name_th: form.name_th || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        address_line3: form.address_line3 || null,
        city: form.city || null,
        country: form.country || null,
        zip_code: form.zip_code || null,
        tel: form.tel || null,
        fax: form.fax || null,
        email: form.email || null,
        attn: form.attn || null,
        remark: form.remark || null,
        vendor_type: form.vendor_type,
        tax_id: form.tax_id || null,
        card_id: form.card_id || null,
        tax_percent: form.tax_percent,
        wht_percent: form.wht_percent,
        credit_term: form.credit_term,
        wht_card_type: form.wht_card_type,
        is_active: form.is_active,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create vendor");
        return;
      }

      router.push("/vendors");
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
        <Link href="/vendors" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Vendor</h1>
          <p className="text-muted-foreground">Create a new vendor record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">General Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="code" className="label-text">
                Vendor Code *
              </label>
              <input
                id="code"
                name="code"
                value={form.code}
                onChange={handleChange}
                className="input-field"
                required
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name_en" className="label-text">
                Name (English) *
              </label>
              <input
                id="name_en"
                name="name_en"
                value={form.name_en}
                onChange={handleChange}
                className="input-field"
                required
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name_th" className="label-text">
                Name (Thai)
              </label>
              <input
                id="name_th"
                name="name_th"
                value={form.name_th}
                onChange={handleChange}
                className="input-field"
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="vendor_type" className="label-text">
                Vendor Type
              </label>
              <select
                id="vendor_type"
                name="vendor_type"
                value={form.vendor_type}
                onChange={handleChange}
                className="input-field"
              >
                <option value="N">Normal</option>
                <option value="G">Government</option>
                <option value="E">Employee</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="tax_id" className="label-text">
                Tax ID
              </label>
              <input
                id="tax_id"
                name="tax_id"
                value={form.tax_id}
                onChange={handleChange}
                className="input-field"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="card_id" className="label-text">
                Card ID
              </label>
              <input
                id="card_id"
                name="card_id"
                value={form.card_id}
                onChange={handleChange}
                className="input-field"
                maxLength={30}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Contact Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="address_line1" className="label-text">
                Address Line 1
              </label>
              <input
                id="address_line1"
                name="address_line1"
                value={form.address_line1}
                onChange={handleChange}
                className="input-field"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="address_line2" className="label-text">
                Address Line 2
              </label>
              <input
                id="address_line2"
                name="address_line2"
                value={form.address_line2}
                onChange={handleChange}
                className="input-field"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="city" className="label-text">
                City
              </label>
              <input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="input-field"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="zip_code" className="label-text">
                Zip Code
              </label>
              <input
                id="zip_code"
                name="zip_code"
                value={form.zip_code}
                onChange={handleChange}
                className="input-field"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tel" className="label-text">
                Telephone
              </label>
              <input
                id="tel"
                name="tel"
                value={form.tel}
                onChange={handleChange}
                className="input-field"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="fax" className="label-text">
                Fax
              </label>
              <input
                id="fax"
                name="fax"
                value={form.fax}
                onChange={handleChange}
                className="input-field"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="label-text">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                maxLength={100}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Tax &amp; Payment Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="tax_percent" className="label-text">
                VAT Rate (%)
              </label>
              <input
                id="tax_percent"
                name="tax_percent"
                type="number"
                step="0.01"
                value={form.tax_percent}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="wht_percent" className="label-text">
                WHT Rate (%)
              </label>
              <input
                id="wht_percent"
                name="wht_percent"
                type="number"
                step="0.01"
                value={form.wht_percent}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="credit_term" className="label-text">
                Credit Term (days)
              </label>
              <input
                id="credit_term"
                name="credit_term"
                type="number"
                value={form.credit_term}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="wht_card_type" className="label-text">
                WHT Card Type
              </label>
              <select
                id="wht_card_type"
                name="wht_card_type"
                value={form.wht_card_type}
                onChange={handleChange}
                className="input-field"
              >
                <option value="company">Company</option>
                <option value="person">Person</option>
                <option value="government">Government</option>
                <option value="non_profit">Non-Profit</option>
                <option value="foreign">Foreign</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="is_active" className="label-text">
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Remarks</h2>
          <textarea
            name="remark"
            value={form.remark}
            onChange={handleChange}
            className="input-field min-h-[100px]"
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/vendors" className="btn-outline">
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
                Create Vendor
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}