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
import { createWhtCode, updateWhtCode, deleteWhtCode } from "@/modules/settings/settings.actions";

interface WhtCode {
  id: string;
  code: string;
  rate: number;
  description: string | null;
  gl_account: string | null;
  assign_zero: boolean;
}

interface WhtCodeFormData {
  code: string;
  rate: number;
  description: string;
  gl_account: string;
  assign_zero: boolean;
}

const emptyForm: WhtCodeFormData = {
  code: "",
  rate: 0,
  description: "",
  gl_account: "",
  assign_zero: false,
};

export default function WhtRatesPage() {
  const [items, setItems] = useState<WhtCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WhtCode | null>(null);
  const [form, setForm] = useState<WhtCodeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("wht_codes").select("*").order("code");
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data as WhtCode[]) ?? []);
    }
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditingItem(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(item: WhtCode) {
    setEditingItem(item);
    setForm({
      code: item.code,
      rate: item.rate,
      description: item.description ?? "",
      gl_account: item.gl_account ?? "",
      assign_zero: item.assign_zero,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        code: form.code,
        rate: form.rate,
        description: form.description || null,
        gl_account: form.gl_account || null,
        assign_zero: form.assign_zero,
      };

      if (editingItem) {
        await updateWhtCode({ id: editingItem.id, ...payload });
      } else {
        await createWhtCode(payload);
      }
      setDialogOpen(false);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save WHT code");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteWhtCode({ id: deleteId });
      setDeleteId(null);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete WHT code");
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WHT Rates</h1>
          <p className="text-muted-foreground">Manage withholding tax codes and rates</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />Add WHT Code</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" placeholder="Search WHT codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
      </div>

      {error && !dialogOpen && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th className="text-right">Rate (%)</th>
              <th>Description</th>
              <th>GL Account</th>
              <th>Zero Assign</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No WHT codes found</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.code}</td>
                  <td className="text-right font-mono">{formatNumber(item.rate * 100, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%</td>
                  <td>{item.description ?? "-"}</td>
                  <td>{item.gl_account ?? "-"}</td>
                  <td>{item.assign_zero ? "Yes" : "No"}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(item)} className="btn-ghost p-1" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(item.id)} className="btn-ghost p-1 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
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
            <DialogTitle>{editingItem ? "Edit WHT Code" : "Add WHT Code"}</DialogTitle>
            <DialogDescription>{editingItem ? "Update WHT code information" : "Create a new WHT code"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="code" className="label-text">Code *</label>
              <input id="code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="input-field" required maxLength={10} />
            </div>
            <div className="space-y-2">
              <label htmlFor="rate" className="label-text">Rate (%) *</label>
              <input id="rate" type="number" step="0.01" min="0" max="1" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} className="input-field" required />
              <p className="text-xs text-muted-foreground">Enter as decimal (e.g. 0.03 for 3%)</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="label-text">Description</label>
              <input id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" maxLength={200} />
            </div>
            <div className="space-y-2">
              <label htmlFor="gl_account" className="label-text">GL Account</label>
              <input id="gl_account" value={form.gl_account} onChange={(e) => setForm((f) => ({ ...f, gl_account: e.target.value }))} className="input-field" maxLength={20} />
            </div>
            <div className="flex items-center gap-2">
              <input id="assign_zero" type="checkbox" checked={form.assign_zero} onChange={(e) => setForm((f) => ({ ...f, assign_zero: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
              <label htmlFor="assign_zero" className="label-text">Assign on Zero Amount</label>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editingItem ? "Update" : "Create"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete WHT Code</DialogTitle>
            <DialogDescription>Are you sure you want to delete this WHT code? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="btn-outline">Cancel</button>
            <button onClick={handleDelete} className="btn-destructive" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}