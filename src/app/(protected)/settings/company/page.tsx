"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save } from "lucide-react";
import { updateConfig } from "@/modules/settings/settings.actions";

interface Config {
  id: string;
  company_code: string | null;
  company_name_en: string | null;
  company_name_th: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  city: string | null;
  country: string | null;
  zip_code: string | null;
  tax_id: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  reg_no: string | null;
  contact_person: string | null;
  vat_percent: number | null;
  wht_percent: number | null;
  default_lang: string | null;
  currency: string | null;
  auto_doc_no: boolean | null;
  vc_auto: boolean | null;
  vc_format1: string | null;
  vc_format2: string | null;
  vc_fix_for: number | null;
  vc_for_len: number | null;
  dr_auto: boolean | null;
  dr_format1: string | null;
  dr_format2: string | null;
  dr_fix_for: number | null;
  dr_for_len: number | null;
  pd_auto: boolean | null;
  pd_format1: string | null;
  pd_format2: string | null;
  pd_fix_for: number | null;
  pd_for_len: number | null;
  dp_auto: boolean | null;
  dp_format1: string | null;
  dp_format2: string | null;
  dp_fix_for: number | null;
  dp_for_len: number | null;
  chk_vc_dup: boolean | null;
  chk_vc_empty: boolean | null;
  chk_inv_dup: boolean | null;
  chk_inv_empty: boolean | null;
  chk_ac_date: boolean | null;
  chk_upd_over: boolean | null;
  chk_ac_trade: boolean | null;
  chk_ac_tax: boolean | null;
  chk_send_gl: boolean | null;
  chk_gl_mn: boolean | null;
  gen_wht: boolean | null;
  prn_wht: boolean | null;
  print_payment: boolean | null;
  chk_cheque_no: boolean | null;
  import_inv: boolean | null;
  print_voucher: boolean | null;
  tax_assign_inv: boolean | null;
  acc_trade: string | null;
  acc_deposit: string | null;
  acc_po: string | null;
  acc_add: string | null;
  created_at: string;
  updated_at: string;
}

type ConfigFormData = Partial<Omit<Config, "id" | "created_at" | "updated_at">>;

const defaultConfig: ConfigFormData = {
  company_code: "",
  company_name_en: "",
  company_name_th: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  city: "",
  country: "",
  zip_code: "",
  tax_id: "",
  phone: "",
  fax: "",
  email: "",
  reg_no: "",
  contact_person: "",
  vat_percent: 0,
  wht_percent: 0,
  default_lang: "en",
  currency: "THB",
  auto_doc_no: false,
  vc_auto: false,
  vc_format1: "VC",
  vc_format2: "yymm",
  vc_fix_for: 4,
  vc_for_len: 10,
  dr_auto: false,
  dr_format1: "DR",
  dr_format2: "yymm",
  dr_fix_for: 4,
  dr_for_len: 10,
  pd_auto: false,
  pd_format1: "PD",
  pd_format2: "yymm",
  pd_fix_for: 4,
  pd_for_len: 10,
  dp_auto: false,
  dp_format1: "DP",
  dp_format2: "yymm",
  dp_fix_for: 4,
  dp_for_len: 10,
  chk_vc_dup: false,
  chk_vc_empty: false,
  chk_inv_dup: false,
  chk_inv_empty: false,
  chk_ac_date: false,
  chk_upd_over: false,
  chk_ac_trade: false,
  chk_ac_tax: false,
  chk_send_gl: false,
  chk_gl_mn: false,
  gen_wht: false,
  prn_wht: false,
  print_payment: false,
  chk_cheque_no: false,
  import_inv: false,
  print_voucher: false,
  tax_assign_inv: false,
  acc_trade: "",
  acc_deposit: "",
  acc_po: "",
  acc_add: "",
};

type TabKey = "company" | "defaults" | "docFormats" | "validation" | "glAccounts";

const tabs: { key: TabKey; label: string }[] = [
  { key: "company", label: "Company Info" },
  { key: "defaults", label: "Defaults" },
  { key: "docFormats", label: "Doc Number Formats" },
  { key: "validation", label: "Validation" },
  { key: "glAccounts", label: "GL Accounts" },
];

export default function CompanySettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<ConfigFormData>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("company");

  const supabase = createClient();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("config")
      .select("*")
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        setError("No company configuration found. Please create one first.");
      } else {
        setError(fetchError.message);
      }
    } else if (data) {
      setConfig(data as Config);
      setForm(data as ConfigFormData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateConfig(form);
      setSuccess("Company settings saved successfully.");
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof ConfigFormData>(key: K, value: ConfigFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const suffixOptions = [
    { value: "yymm", label: "Year-Month (yymm)" },
    { value: "yy", label: "Year (yy)" },
    { value: "none", label: "None" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">Configure company information and system defaults</p>
      </div>

      {error && !saving && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setError(null); setSuccess(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === "company" && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Company Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="company_code" className="label-text">Company Code</label>
                <input
                  id="company_code"
                  value={form.company_code ?? ""}
                  onChange={(e) => updateField("company_code", e.target.value || null)}
                  className="input-field"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="tax_id" className="label-text">Tax ID</label>
                <input
                  id="tax_id"
                  value={form.tax_id ?? ""}
                  onChange={(e) => updateField("tax_id", e.target.value || null)}
                  className="input-field"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="company_name_en" className="label-text">Company Name (EN)</label>
                <input
                  id="company_name_en"
                  value={form.company_name_en ?? ""}
                  onChange={(e) => updateField("company_name_en", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="company_name_th" className="label-text">Company Name (TH)</label>
                <input
                  id="company_name_th"
                  value={form.company_name_th ?? ""}
                  onChange={(e) => updateField("company_name_th", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="address_line1" className="label-text">Address Line 1</label>
                <input
                  id="address_line1"
                  value={form.address_line1 ?? ""}
                  onChange={(e) => updateField("address_line1", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="address_line2" className="label-text">Address Line 2</label>
                <input
                  id="address_line2"
                  value={form.address_line2 ?? ""}
                  onChange={(e) => updateField("address_line2", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="address_line3" className="label-text">Address Line 3</label>
                <input
                  id="address_line3"
                  value={form.address_line3 ?? ""}
                  onChange={(e) => updateField("address_line3", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="city" className="label-text">City</label>
                <input
                  id="city"
                  value={form.city ?? ""}
                  onChange={(e) => updateField("city", e.target.value || null)}
                  className="input-field"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="country" className="label-text">Country</label>
                <input
                  id="country"
                  value={form.country ?? ""}
                  onChange={(e) => updateField("country", e.target.value || null)}
                  className="input-field"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="zip_code" className="label-text">Zip Code</label>
                <input
                  id="zip_code"
                  value={form.zip_code ?? ""}
                  onChange={(e) => updateField("zip_code", e.target.value || null)}
                  className="input-field"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="label-text">Phone</label>
                <input
                  id="phone"
                  value={form.phone ?? ""}
                  onChange={(e) => updateField("phone", e.target.value || null)}
                  className="input-field"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="fax" className="label-text">Fax</label>
                <input
                  id="fax"
                  value={form.fax ?? ""}
                  onChange={(e) => updateField("fax", e.target.value || null)}
                  className="input-field"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="label-text">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => updateField("email", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="reg_no" className="label-text">Registration No.</label>
                <input
                  id="reg_no"
                  value={form.reg_no ?? ""}
                  onChange={(e) => updateField("reg_no", e.target.value || null)}
                  className="input-field"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact_person" className="label-text">Contact Person</label>
                <input
                  id="contact_person"
                  value={form.contact_person ?? ""}
                  onChange={(e) => updateField("contact_person", e.target.value || null)}
                  className="input-field"
                  maxLength={200}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "defaults" && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold">System Defaults</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="vat_percent" className="label-text">VAT Percent (%)</label>
                <input
                  id="vat_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.vat_percent ?? 0}
                  onChange={(e) => updateField("vat_percent", parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="wht_percent" className="label-text">WHT Percent (%)</label>
                <input
                  id="wht_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.wht_percent ?? 0}
                  onChange={(e) => updateField("wht_percent", parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="default_lang" className="label-text">Default Language</label>
                <select
                  id="default_lang"
                  value={form.default_lang ?? "en"}
                  onChange={(e) => updateField("default_lang", e.target.value)}
                  className="input-field"
                >
                  <option value="en">English</option>
                  <option value="th">Thai</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="currency" className="label-text">Currency</label>
                <input
                  id="currency"
                  value={form.currency ?? ""}
                  onChange={(e) => updateField("currency", e.target.value || null)}
                  className="input-field"
                  maxLength={10}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="auto_doc_no"
                  type="checkbox"
                  checked={form.auto_doc_no ?? false}
                  onChange={(e) => updateField("auto_doc_no", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="auto_doc_no" className="label-text">Auto Document Numbering</label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "docFormats" && (
          <div className="space-y-6">
            {(
              [
                { prefix: "vc", label: "VC / Invoice" },
                { prefix: "dr", label: "DR / Debit Note" },
                { prefix: "pd", label: "PD / Payment" },
                { prefix: "dp", label: "DP / Deposit" },
              ] as const
            ).map(({ prefix, label }) => (
              <div key={prefix} className="card p-6 space-y-4">
                <h2 className="text-lg font-semibold">{label}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      id={`${prefix}_auto`}
                      type="checkbox"
                      checked={form[`${prefix}_auto` as keyof ConfigFormData] as boolean ?? false}
                      onChange={(e) => updateField(`${prefix}_auto` as keyof ConfigFormData, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`${prefix}_auto`} className="label-text">Auto Numbering</label>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`${prefix}_format1`} className="label-text">Prefix</label>
                    <input
                      id={`${prefix}_format1`}
                      value={(form[`${prefix}_format1` as keyof ConfigFormData] as string) ?? ""}
                      onChange={(e) => updateField(`${prefix}_format1` as keyof ConfigFormData, e.target.value || null)}
                      className="input-field"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`${prefix}_format2`} className="label-text">Suffix Type</label>
                    <select
                      id={`${prefix}_format2`}
                      value={(form[`${prefix}_format2` as keyof ConfigFormData] as string) ?? "yymm"}
                      onChange={(e) => updateField(`${prefix}_format2` as keyof ConfigFormData, e.target.value || null)}
                      className="input-field"
                    >
                      {suffixOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`${prefix}_fix_for`} className="label-text">Fixed Digits</label>
                    <input
                      id={`${prefix}_fix_for`}
                      type="number"
                      min="1"
                      max="20"
                      value={(form[`${prefix}_fix_for` as keyof ConfigFormData] as number) ?? 4}
                      onChange={(e) => updateField(`${prefix}_fix_for` as keyof ConfigFormData, parseInt(e.target.value) || 4)}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`${prefix}_for_len`} className="label-text">Total Length</label>
                    <input
                      id={`${prefix}_for_len`}
                      type="number"
                      min="1"
                      max="30"
                      value={(form[`${prefix}_for_len` as keyof ConfigFormData] as number) ?? 10}
                      onChange={(e) => updateField(`${prefix}_for_len` as keyof ConfigFormData, parseInt(e.target.value) || 10)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "validation" && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Validation &amp; Check Flags</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { key: "chk_vc_dup", label: "Check Voucher Duplicate" },
                { key: "chk_vc_empty", label: "Check Voucher Empty" },
                { key: "chk_inv_dup", label: "Check Invoice Duplicate" },
                { key: "chk_inv_empty", label: "Check Invoice Empty" },
                { key: "chk_ac_date", label: "Check Accounting Date" },
                { key: "chk_upd_over", label: "Check Update Over Period" },
                { key: "chk_ac_trade", label: "Check Trade Account" },
                { key: "chk_ac_tax", label: "Check Tax Account" },
                { key: "chk_send_gl", label: "Check Send to GL" },
                { key: "chk_gl_mn", label: "Check GL Manual" },
                { key: "gen_wht", label: "Generate WHT" },
                { key: "prn_wht", label: "Print WHT" },
                { key: "print_payment", label: "Print Payment" },
                { key: "chk_cheque_no", label: "Check Cheque No." },
                { key: "import_inv", label: "Import Invoice" },
                { key: "print_voucher", label: "Print Voucher" },
                { key: "tax_assign_inv", label: "Tax Assign Invoice" },
              ] as { key: keyof ConfigFormData; label: string }[]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    id={key}
                    type="checkbox"
                    checked={(form[key] as boolean) ?? false}
                    onChange={(e) => updateField(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={key} className="label-text">{label}</label>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "glAccounts" && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold">GL Account Defaults</h2>
            <p className="text-sm text-muted-foreground">
              Default GL accounts for trade, deposit, purchase order, and additional entries.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="acc_trade" className="label-text">Trade Account</label>
                <input
                  id="acc_trade"
                  value={form.acc_trade ?? ""}
                  onChange={(e) => updateField("acc_trade", e.target.value || null)}
                  className="input-field"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="acc_deposit" className="label-text">Deposit Account</label>
                <input
                  id="acc_deposit"
                  value={form.acc_deposit ?? ""}
                  onChange={(e) => updateField("acc_deposit", e.target.value || null)}
                  className="input-field"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="acc_po" className="label-text">Purchase Order Account</label>
                <input
                  id="acc_po"
                  value={form.acc_po ?? ""}
                  onChange={(e) => updateField("acc_po", e.target.value || null)}
                  className="input-field"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="acc_add" className="label-text">Additional Account</label>
                <input
                  id="acc_add"
                  value={form.acc_add ?? ""}
                  onChange={(e) => updateField("acc_add", e.target.value || null)}
                  className="input-field"
                  maxLength={20}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => { setForm(config ? (config as ConfigFormData) : defaultConfig); setError(null); setSuccess(null); }}
            className="btn-outline"
          >
            Reset
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}