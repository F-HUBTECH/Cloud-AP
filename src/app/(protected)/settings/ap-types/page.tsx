"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
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
import { createApType, updateApType, deleteApType } from "@/modules/settings/settings.actions";

interface ApType {
  id: string;
  code: string;
  name: string;
}

interface ApTypeFormData {
  code: string;
  name: string;
}

const emptyForm: ApTypeFormData = { code: "", name: "" };

export default function ApTypesPage() {
  const [items, setItems] = useState<ApType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApType | null>(null);
  const [form, setForm] = useState<ApTypeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("ap_types").select("*").order("code");
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data as ApType[]) ?? []);
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

  function openEdit(item: ApType) {
    setEditingItem(item);
    setForm({ code: item.code, name: item.name });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingItem) {
        startTransition(() => {
          updateApType({ id: editingItem.id, code: form.code, name: form.name }).then(() => {
            setDialogOpen(false);
            fetchItems();
          });
        });
      } else {
        startTransition(() => {
          createApType({ code: form.code, name: form.name }).then(() => {
            setDialogOpen(false);
            fetchItems();
          });
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save AP type");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      startTransition(() => {
        deleteApType({ id: deleteId }).then(() => {
          setDeleteId(null);
          fetchItems();
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete AP type");
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AP Types</h1>
          <p className="text-muted-foreground">Manage accounts payable document types</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add AP Type
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search AP types..."
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
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-muted-foreground">
                  No AP types found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.code}</td>
                  <td>{item.name}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(item)} className="btn-ghost p-1" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="btn-ghost p-1 text-destructive" title="Delete">
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
            <DialogTitle>{editingItem ? "Edit AP Type" : "Add AP Type"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update AP type information" : "Create a new AP document type"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
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
              <label htmlFor="name" className="label-text">Name *</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
                required
                maxLength={200}
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving || isPending}>
                {saving || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingItem ? "Update" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete AP Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this AP type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="btn-outline">Cancel</button>
            <button onClick={handleDelete} className="btn-destructive" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}