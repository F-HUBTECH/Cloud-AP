"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils/format";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createVatCode, updateVatCode, deleteVatCode } from "@/modules/settings/settings.actions";

interface VatCode {
  id: string;
  code: string;
  rate: number;
  description: string | null;
  gl_account: string | null;
}

interface VatCodeFormData {
  code: string;
  rate: number;
  description: string;
  gl_account: string;
}

const emptyForm: VatCodeFormData = {
  code: "",
  rate: 0,
  description: "",
  gl_account: "",
};

export default function VatRatesPage() {
  const [items, setItems] = useState<VatCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VatCode | null>(null);
  const [form, setForm] = useState<VatCodeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const supabase = useMemo(() => createClient(), []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("vat_codes").select("*").order("code");
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data as VatCode[]) ?? []);
    }
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    setEditingItem(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(item: VatCode) {
    setEditingItem(item);
    setForm({
      code: item.code,
      rate: item.rate,
      description: item.description ?? "",
      gl_account: item.gl_account ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingItem) {
        await updateVatCode({
          id: editingItem.id,
          code: form.code,
          rate: form.rate,
          description: form.description || null,
          gl_account: form.gl_account || null,
        });
      } else {
        await createVatCode({
          code: form.code,
          rate: form.rate,
          description: form.description || null,
          gl_account: form.gl_account || null,
        });
      }
      setDialogOpen(false);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save VAT code");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteVatCode({ id: deleteId });
      setDeleteId(null);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete VAT code");
      setDeleteId(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VAT Rates</h1>
          <p className="text-muted-foreground">Manage VAT codes and rates</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add VAT Code
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search VAT codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th className="text-right">Rate (%)</th>
              <th>Description</th>
              <th>Account</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No VAT codes found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.code}</td>
                  <td className="text-right font-mono">
                    {formatNumber(item.rate * 100, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%
                  </td>
                  <td>{item.description ?? "-"}</td>
                  <td>{item.gl_account ?? "-"}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="btn-ghost p-1"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="btn-ghost p-1 text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit VAT Code" : "Add VAT Code"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update VAT code information" : "Create a new VAT code"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="code" className="label-text">Code *</label>
              <input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="input-field"
                required
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rate" className="label-text">Rate (%) *</label>
              <input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
                className="input-field"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter as decimal (e.g. 0.07 for 7%)
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="label-text">Description</label>
              <input
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input-field"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="gl_account" className="label-text">GL Account</label>
              <input
                id="gl_account"
                value={form.gl_account}
                onChange={(e) => setForm((f) => ({ ...f, gl_account: e.target.value }))}
                className="input-field"
                maxLength={20}
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? "Update" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete VAT Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this VAT code? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="btn-outline">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-destructive">
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}