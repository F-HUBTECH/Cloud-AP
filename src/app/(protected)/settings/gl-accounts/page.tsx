"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createGlAccount, updateGlAccount, deleteGlAccount } from "@/modules/settings/settings.actions";

interface GlAccount {
  id: string;
  code: string;
  name: string;
  level_no: number;
  parent_code: string | null;
  account_type: string;
  is_active: boolean;
}

interface GlAccountFormData {
  code: string;
  name: string;
  level_no: number;
  parent_code: string | null;
  account_type: string;
  is_active: boolean;
}

const emptyForm: GlAccountFormData = {
  code: "",
  name: "",
  level_no: 1,
  parent_code: null,
  account_type: "detail",
  is_active: true,
};

const ACCOUNT_TYPES = [
  { value: "detail", label: "Detail" },
  { value: "header", label: "Header" },
  { value: "subtotal", label: "Subtotal" },
];

export default function GlAccountsPage() {
  const [items, setItems] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GlAccount | null>(null);
  const [form, setForm] = useState<GlAccountFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("gl_accounts").select("*").order("code");
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data as GlAccount[]) ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    setEditingItem(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(item: GlAccount) {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      level_no: item.level_no,
      parent_code: item.parent_code,
      account_type: item.account_type,
      is_active: item.is_active,
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
        await updateGlAccount({
          id: editingItem.id,
          code: form.code,
          name: form.name,
          level_no: form.level_no,
          parent_code: form.parent_code || null,
          account_type: form.account_type,
          is_active: form.is_active,
        });
      } else {
        await createGlAccount({
          code: form.code,
          name: form.name,
          level_no: form.level_no,
          parent_code: form.parent_code || null,
          account_type: form.account_type,
          is_active: form.is_active,
        });
      }
      setDialogOpen(false);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save GL account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteGlAccount({ id: deleteId });
      setDeleteId(null);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete GL account");
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage general ledger accounts</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add GL Account
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search GL accounts..."
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
              <th>Name</th>
              <th>Level</th>
              <th>Parent</th>
              <th>Type</th>
              <th>Active</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No GL accounts found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.level_no}</td>
                  <td>{item.parent_code ?? "—"}</td>
                  <td className="capitalize">{item.account_type}</td>
                  <td>{item.is_active ? "Yes" : "No"}</td>
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
            <DialogTitle>{editingItem ? "Edit GL Account" : "Add GL Account"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update GL account information" : "Create a new general ledger account"}
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
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="label-text">Name *</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="level_no" className="label-text">Level No</label>
              <input
                id="level_no"
                type="number"
                min={1}
                value={form.level_no}
                onChange={(e) => setForm((f) => ({ ...f, level_no: parseInt(e.target.value) || 1 }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="parent_code" className="label-text">Parent Code</label>
              <input
                id="parent_code"
                value={form.parent_code ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, parent_code: e.target.value || null }))}
                className="input-field"
                maxLength={20}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="account_type" className="label-text">Account Type</label>
              <select
                id="account_type"
                value={form.account_type}
                onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
                className="input-field"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_active" className="label-text">Active</label>
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
            <DialogTitle>Delete GL Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this GL account? This action cannot be undone.
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