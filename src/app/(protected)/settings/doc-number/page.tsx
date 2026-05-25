"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save } from "lucide-react";

interface DocTypeConfig {
  label: string;
  auto: number;
  format1: string;
  format2: string;
  fix_for: number;
  for_len: number;
}

interface DocNumberSequence {
  id: string;
  table_name: string;
  field_name: string;
  group_key: string;
  last_value: number;
  created_at: string;
  updated_at: string;
}

const SUFFIX_OPTIONS = [
  { value: "none", label: "None" },
  { value: "yy", label: "Year (yy)" },
  { value: "yymm", label: "Year-Month (yymm)" },
];

const DOC_TYPE_KEYS = ["vc", "dr", "pd", "dp"] as const;
const DOC_TYPE_LABELS: Record<string, string> = {
  vc: "Invoice (VC)",
  dr: "Debit Note (DR)",
  pd: "Payment (PD)",
  dp: "Deposit (DP)",
};

function buildInitialConfig(): Record<string, DocTypeConfig> {
  const config: Record<string, DocTypeConfig> = {};
  for (const key of DOC_TYPE_KEYS) {
    config[key] = {
      label: DOC_TYPE_LABELS[key],
      auto: 0,
      format1: key.toUpperCase(),
      format2: "none",
      fix_for: 4,
      for_len: 8,
    };
  }
  return config;
}

export default function DocNumberPage() {
  const [config, setConfig] = useState<Record<string, DocTypeConfig>>(buildInitialConfig);
  const [sequences, setSequences] = useState<DocNumberSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("config")
        .select("*")
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (data) {
        setConfig((prev) => {
          const next = { ...prev };
          for (const key of DOC_TYPE_KEYS) {
            next[key] = {
              ...next[key],
              auto: data[`${key}_auto`] ?? 0,
              format1: data[`${key}_format1`] ?? key.toUpperCase(),
              format2: data[`${key}_format2`] ?? "none",
              fix_for: data[`${key}_fix_for`] ?? 4,
              for_len: data[`${key}_for_len`] ?? 8,
            };
          }
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSequences = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("doc_number_sequences")
        .select("*")
        .order("table_name");

      if (fetchError) throw fetchError;
      setSequences((data as DocNumberSequence[]) ?? []);
    } catch {
      // sequences are read-only, silently ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchSequences()]);
  }, [fetchConfig, fetchSequences]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload: Record<string, unknown> = {};
    for (const key of DOC_TYPE_KEYS) {
      const c = config[key];
      payload[`${key}_auto`] = c.auto;
      payload[`${key}_format1`] = c.format1;
      payload[`${key}_format2`] = c.format2;
      payload[`${key}_fix_for`] = c.fix_for;
      payload[`${key}_for_len`] = c.for_len;
    }

    try {
      const { updateConfig } = await import("@/modules/settings/settings.actions");
      await updateConfig(payload);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(key: string, field: keyof DocTypeConfig, value: unknown) {
    setConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Document Number Configuration</h1>
        <p className="text-muted-foreground">
          Configure auto-numbering and format for each document type
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
          Configuration saved successfully.
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Document Number Format</h2>
            <p className="text-sm text-muted-foreground">
              Define prefix, suffix type, and numbering for each document type
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th className="text-center">Auto Number</th>
                  <th>Prefix</th>
                  <th>Suffix Type</th>
                  <th className="text-right">Fixed Digits</th>
                  <th className="text-right">Total Length</th>
                </tr>
              </thead>
              <tbody>
                {DOC_TYPE_KEYS.map((key) => {
                  const c = config[key];
                  return (
                    <tr key={key}>
                      <td className="font-medium">{c.label}</td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={c.auto === 1}
                          onChange={(e) =>
                            updateConfig(key, "auto", e.target.checked ? 1 : 0)
                          }
                          className="h-4 w-4"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={c.format1}
                          onChange={(e) =>
                            updateConfig(key, "format1", e.target.value)
                          }
                          className="input-field w-24"
                          maxLength={10}
                        />
                      </td>
                      <td>
                        <select
                          value={c.format2}
                          onChange={(e) =>
                            updateConfig(key, "format2", e.target.value)
                          }
                          className="input-field w-36"
                        >
                          {SUFFIX_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={c.fix_for}
                          onChange={(e) =>
                            updateConfig(key, "fix_for", parseInt(e.target.value) || 0)
                          }
                          className="input-field w-20 text-right"
                          min={0}
                          max={20}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={c.for_len}
                          onChange={(e) =>
                            updateConfig(key, "for_len", parseInt(e.target.value) || 0)
                          }
                          className="input-field w-20 text-right"
                          min={0}
                          max={30}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Configuration
            </button>
          </div>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Current Sequences</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Read-only view of the current document number sequence values
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Table Name</th>
              <th>Field Name</th>
              <th>Group / Prefix</th>
              <th className="text-right">Last Number</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
            {sequences.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No sequences found
                </td>
              </tr>
            ) : (
              sequences.map((seq) => (
                <tr key={seq.id}>
                  <td className="font-medium">{seq.table_name}</td>
                  <td>{seq.field_name}</td>
                  <td>{seq.group_key}</td>
                  <td className="text-right font-mono">{seq.last_value}</td>
                  <td>
                    {seq.updated_at
                      ? new Date(seq.updated_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}