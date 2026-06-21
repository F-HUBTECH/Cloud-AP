"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Loader2,
  Building2,
  Phone,
  Calculator,
  ClipboardList,
} from "lucide-react";
import { createVendor } from "@/modules/vendor/vendor.actions";
import { vendorSchema, type VendorSchemaInput } from "@/modules/vendor/vendor.schema";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  { id: 1, label: "General", icon: Building2 },
  { id: 2, label: "Contact", icon: Phone },
  { id: 3, label: "Tax & Payment", icon: Calculator },
  { id: 4, label: "Review", icon: ClipboardList },
] as const;

export default function NewVendorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<VendorSchemaInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
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
    },
    mode: "onChange",
  });

  const { formState: { errors } } = form;

  // Validate current step fields before advancing
  const validateStep = useCallback(async () => {
    const fieldsByStep: Record<number, (keyof VendorSchemaInput)[]> = {
      1: ["code", "name_en", "vendor_type", "tax_id", "card_id"],
      2: ["address_line1", "city", "tel", "email"],
      3: ["tax_percent", "wht_percent", "credit_term", "wht_card_type"],
      4: [],
    };

    const fields = fieldsByStep[step] ?? [];
    if (fields.length === 0) return true;

    const valid = await form.trigger(fields);
    return valid;
  }, [step, form]);

  const handleNext = async () => {
    const valid = await validateStep();
    if (valid && step < 4) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setServerError(null);
    setIsSaving(true);

    try {
      const data = form.getValues();
      const result = await createVendor({
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
        vendor_type: data.vendor_type ?? "N",
        tax_id: data.tax_id || null,
        card_id: data.card_id || null,
      });

      if (!result.success) {
        setServerError(result.error ?? "Failed to create vendor");
        return;
      }

      router.push("/vendors");
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const register = form.register;
  const Field = ({
    name,
    label,
    required,
    children,
  }: {
    name: keyof VendorSchemaInput;
    label: string;
    required?: boolean;
    children: React.ReactNode;
  }) => {
    const error = errors[name];
    return (
      <div className="space-y-1.5">
        <label htmlFor={name} className="label-text">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {children}
        {error && (
          <p className="text-xs text-destructive">{error.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/vendors" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Vendor</h1>
          <p className="text-sm text-muted-foreground">
            Step {step} of 4 — {STEPS[step - 1].label}
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
                  isActive &&
                    "border-primary bg-primary text-primary-foreground",
                  isComplete &&
                    "border-primary bg-primary text-primary-foreground",
                  !isActive &&
                    !isComplete &&
                    "border-border text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
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
                <div
                  className={cn(
                    "hidden h-0.5 flex-1 sm:block",
                    isComplete ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="card p-6 space-y-6"
      >
        {/* Step 1: General Information */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">General Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="code" label="Vendor Code" required>
                <input
                  id="code"
                  {...register("code")}
                  className="input-field"
                  maxLength={20}
                  autoFocus
                />
              </Field>
              <Field name="name_en" label="Name (English)" required>
                <input
                  id="name_en"
                  {...register("name_en")}
                  className="input-field"
                  maxLength={200}
                />
              </Field>
              <Field name="name_th" label="Name (Thai)">
                <input
                  id="name_th"
                  {...register("name_th")}
                  className="input-field"
                  maxLength={200}
                />
              </Field>
              <Field name="vendor_type" label="Vendor Type">
                <select
                  id="vendor_type"
                  {...register("vendor_type")}
                  className="input-field"
                >
                  <option value="N">Normal</option>
                  <option value="G">Government</option>
                  <option value="E">Employee</option>
                  <option value="O">Other</option>
                </select>
              </Field>
              <Field name="tax_id" label="Tax ID">
                <input
                  id="tax_id"
                  {...register("tax_id")}
                  className="input-field"
                  maxLength={20}
                />
              </Field>
              <Field name="card_id" label="Card ID">
                <input
                  id="card_id"
                  {...register("card_id")}
                  className="input-field"
                  maxLength={20}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2: Contact & Address */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Contact &amp; Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="address_line1" label="Address Line 1">
                <input
                  id="address_line1"
                  {...register("address_line1")}
                  className="input-field"
                  maxLength={500}
                />
              </Field>
              <Field name="address_line2" label="Address Line 2">
                <input
                  id="address_line2"
                  {...register("address_line2")}
                  className="input-field"
                  maxLength={500}
                />
              </Field>
              <Field name="city" label="City">
                <input
                  id="city"
                  {...register("city")}
                  className="input-field"
                  maxLength={100}
                />
              </Field>
              <Field name="country" label="Country">
                <input
                  id="country"
                  {...register("country")}
                  className="input-field"
                  maxLength={100}
                />
              </Field>
              <Field name="zip_code" label="Zip Code">
                <input
                  id="zip_code"
                  {...register("zip_code")}
                  className="input-field"
                  maxLength={10}
                />
              </Field>
              <Field name="tel" label="Telephone">
                <input
                  id="tel"
                  {...register("tel")}
                  className="input-field"
                  maxLength={50}
                />
              </Field>
              <Field name="fax" label="Fax">
                <input
                  id="fax"
                  {...register("fax")}
                  className="input-field"
                  maxLength={50}
                />
              </Field>
              <Field name="email" label="Email">
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="input-field"
                  maxLength={200}
                />
              </Field>
              <Field name="attn" label="Attention">
                <input
                  id="attn"
                  {...register("attn")}
                  className="input-field"
                  placeholder="Contact person name"
                  maxLength={200}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Step 3: Tax & Payment */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Tax &amp; Payment Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="tax_percent" label="VAT Rate">
                <input
                  id="tax_percent"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  {...register("tax_percent", { valueAsNumber: true })}
                  className="input-field"
                />
              </Field>
              <Field name="wht_percent" label="WHT Rate">
                <input
                  id="wht_percent"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  {...register("wht_percent", { valueAsNumber: true })}
                  className="input-field"
                />
              </Field>
              <Field name="credit_term" label="Credit Term (days)">
                <input
                  id="credit_term"
                  type="number"
                  min={0}
                  {...register("credit_term", { valueAsNumber: true })}
                  className="input-field"
                />
              </Field>
              <Field name="wht_card_type" label="WHT Card Type">
                <select
                  id="wht_card_type"
                  {...register("wht_card_type")}
                  className="input-field"
                >
                  <option value="company">Company</option>
                  <option value="person">Person</option>
                  <option value="government">Government</option>
                  <option value="non_profit">Non-Profit</option>
                  <option value="foreign">Foreign</option>
                </select>
              </Field>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="is_active"
                  type="checkbox"
                  {...register("is_active")}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <label htmlFor="is_active" className="label-text">
                  Active
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Review &amp; Confirm</h2>
            <p className="text-sm text-muted-foreground">
              Please review the information before creating this vendor.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewField label="Vendor Code" value={form.watch("code")} />
              <ReviewField label="Name (EN)" value={form.watch("name_en")} />
              <ReviewField label="Name (TH)" value={form.watch("name_th")} />
              <ReviewField label="Vendor Type" value={form.watch("vendor_type") === "N" ? "Normal" : form.watch("vendor_type") === "G" ? "Government" : form.watch("vendor_type") === "E" ? "Employee" : "Other"} />
              <ReviewField label="Tax ID" value={form.watch("tax_id")} />
              <ReviewField label="Card ID" value={form.watch("card_id")} />
              <ReviewField label="Address" value={[form.watch("address_line1"), form.watch("address_line2"), form.watch("city"), form.watch("country"), form.watch("zip_code")].filter(Boolean).join(", ")} />
              <ReviewField label="Tel" value={form.watch("tel")} />
              <ReviewField label="Email" value={form.watch("email")} />
              <ReviewField label="Attn" value={form.watch("attn")} />
              <ReviewField label="VAT Rate" value={form.watch("tax_percent") ? `${form.watch("tax_percent")}%` : "0%"} />
              <ReviewField label="WHT Rate" value={form.watch("wht_percent") ? `${form.watch("wht_percent")}%` : "0%"} />
              <ReviewField label="Credit Term" value={`${form.watch("credit_term") || 0} days`} />
              <ReviewField label="WHT Card Type" value={form.watch("wht_card_type")} />
              <ReviewField label="Status" value={form.watch("is_active") ? "Active" : "Inactive"} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-outline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/vendors" className="btn-ghost">
              Cancel
            </Link>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Vendor
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

function ReviewField({
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
