"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { updateVendor } from "@/modules/vendor/vendor.actions";
import { vendorSchema, type VendorSchemaInput } from "@/modules/vendor/vendor.schema";
import type { Vendor } from "@/modules/vendor/vendor.types";

const EMPTY_VALUES: VendorSchemaInput = {
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
  keep_po: false,
  transfer_ap: false,
  wht_card_type: "company",
  is_active: true,
};

function toFormValues(vendor: Vendor): VendorSchemaInput {
  return {
    ...EMPTY_VALUES,
    code: vendor.code,
    name_en: vendor.name_en,
    name_th: vendor.name_th ?? "",
    address_line1: vendor.address_line1 ?? "",
    address_line2: vendor.address_line2 ?? "",
    address_line3: vendor.address_line3 ?? "",
    city: vendor.city ?? "",
    country: vendor.country ?? "",
    zip_code: vendor.zip_code ?? "",
    tel: vendor.tel ?? "",
    fax: vendor.fax ?? "",
    email: vendor.email ?? "",
    attn: vendor.attn ?? "",
    remark: vendor.remark ?? "",
    vendor_type: vendor.vendor_type ?? "N",
    tax_id: vendor.tax_id ?? "",
    card_id: vendor.card_id ?? "",
    tax_percent: vendor.tax_percent ?? 0,
    wht_percent: vendor.wht_percent ?? 0,
    credit_term: vendor.credit_term ?? 0,
    wht_card_type: vendor.wht_card_type ?? "company",
    is_active: vendor.is_active,
  };
}

export function EditVendorForm({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VendorSchemaInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: EMPTY_VALUES,
    mode: "onChange",
  });

  useEffect(() => reset(toFormValues(vendor)), [reset, vendor]);

  const onSubmit = async (data: VendorSchemaInput) => {
    setServerError(null);
    setIsSaving(true);
    const result = await updateVendor(vendor.id, {
      ...data,
      name_th: data.name_th || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      address_line3: data.address_line3 || null,
      city: data.city || null,
      country: data.country || null,
      zip_code: data.zip_code || null,
      tel: data.tel || null,
      fax: data.fax || null,
      email: data.email || null,
      attn: data.attn || null,
      remark: data.remark || null,
      tax_id: data.tax_id || null,
      card_id: data.card_id || null,
    });
    setIsSaving(false);

    if (!result.success) {
      setServerError(result.error ?? "Failed to update vendor");
      return;
    }

    router.push(`/vendors/${vendor.id}`);
    router.refresh();
  };

  const field = (name: keyof VendorSchemaInput, label: string, input: React.ReactNode, required = false) => (
    <div className="space-y-1.5">
      <label className="label-text" htmlFor={name}>{label}{required && <span className="ml-0.5 text-destructive">*</span>}</label>
      {input}
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/vendors/${vendor.id}`} className="btn-ghost"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-2xl font-bold tracking-tight">Edit Vendor</h1><p className="text-sm text-muted-foreground">{vendor.code} · {vendor.name_en}</p></div>
      </div>
      {serverError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6 p-6">
        <section className="space-y-4"><h2 className="text-lg font-semibold">General Information</h2><div className="grid gap-4 sm:grid-cols-2">
          {field("code", "Vendor Code", <input id="code" {...register("code")} className="input-field" maxLength={20} />, true)}
          {field("name_en", "Name (English)", <input id="name_en" {...register("name_en")} className="input-field" maxLength={200} />, true)}
          {field("name_th", "Name (Thai)", <input id="name_th" {...register("name_th")} className="input-field" maxLength={200} />)}
          {field("vendor_type", "Vendor Type", <select id="vendor_type" {...register("vendor_type")} className="input-field"><option value="N">Normal</option><option value="G">Government</option><option value="E">Employee</option><option value="O">Other</option></select>)}
          {field("tax_id", "Tax ID", <input id="tax_id" {...register("tax_id")} className="input-field" maxLength={20} />)}
          {field("card_id", "Card ID", <input id="card_id" {...register("card_id")} className="input-field" maxLength={20} />)}
        </div></section>
        <section className="space-y-4"><h2 className="text-lg font-semibold">Contact &amp; Address</h2><div className="grid gap-4 sm:grid-cols-2">
          {field("address_line1", "Address Line 1", <input id="address_line1" {...register("address_line1")} className="input-field" maxLength={500} />)}
          {field("address_line2", "Address Line 2", <input id="address_line2" {...register("address_line2")} className="input-field" maxLength={500} />)}
          {field("city", "City", <input id="city" {...register("city")} className="input-field" maxLength={100} />)}
          {field("country", "Country", <input id="country" {...register("country")} className="input-field" maxLength={100} />)}
          {field("zip_code", "Zip Code", <input id="zip_code" {...register("zip_code")} className="input-field" maxLength={10} />)}
          {field("tel", "Telephone", <input id="tel" {...register("tel")} className="input-field" maxLength={50} />)}
          {field("fax", "Fax", <input id="fax" {...register("fax")} className="input-field" maxLength={50} />)}
          {field("email", "Email", <input id="email" type="email" {...register("email")} className="input-field" maxLength={200} />)}
          {field("attn", "Attention", <input id="attn" {...register("attn")} className="input-field" maxLength={200} />)}
        </div></section>
        <section className="space-y-4"><h2 className="text-lg font-semibold">Tax &amp; Payment Settings</h2><div className="grid gap-4 sm:grid-cols-2">
          {field("tax_percent", "VAT Rate", <input id="tax_percent" type="number" step="0.01" min={0} max={1} {...register("tax_percent", { valueAsNumber: true })} className="input-field" />)}
          {field("wht_percent", "WHT Rate", <input id="wht_percent" type="number" step="0.01" min={0} max={1} {...register("wht_percent", { valueAsNumber: true })} className="input-field" />)}
          {field("credit_term", "Credit Term (days)", <input id="credit_term" type="number" min={0} {...register("credit_term", { valueAsNumber: true })} className="input-field" />)}
          {field("wht_card_type", "WHT Card Type", <select id="wht_card_type" {...register("wht_card_type")} className="input-field"><option value="company">Company</option><option value="person">Person</option><option value="government">Government</option><option value="non_profit">Non-Profit</option><option value="foreign">Foreign</option></select>)}
          <label className="flex items-center gap-2 pt-5"><input type="checkbox" {...register("is_active")} className="h-4 w-4 rounded border-input accent-primary" /> <span className="label-text">Active</span></label>
        </div></section>
        <div className="flex justify-end gap-3 border-t pt-4"><Link href={`/vendors/${vendor.id}`} className="btn-ghost">Cancel</Link><button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}</button></div>
      </form>
    </div>
  );
}
