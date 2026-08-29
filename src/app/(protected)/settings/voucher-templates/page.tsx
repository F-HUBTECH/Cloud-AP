"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

interface Template { id: string; description: string; }

export default function VoucherTemplatesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("voucher_description_templates").select("id, description").order("description");
    if (search.trim()) query = query.ilike("description", `%${search.trim()}%`);
    const { data, error: fetchError } = await query;
    setItems((data as Template[]) ?? []);
    if (fetchError) setError(fetchError.message);
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  function startCreate() { setEditing(null); setValue(""); setError(null); }
  function startEdit(item: Template) { setEditing(item); setValue(item.description); setError(null); }

  async function save() {
    const description = value.trim();
    if (!description) { setError("Description is required"); return; }
    setSaving(true); setError(null);
    const result = editing
      ? await supabase.from("voucher_description_templates").update({ description }).eq("id", editing.id)
      : await supabase.from("voucher_description_templates").insert({ description });
    if (result.error) setError(result.error.message);
    else { setEditing(null); setValue(""); await fetchItems(); }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this voucher template?")) return;
    const { error: deleteError } = await supabase.from("voucher_description_templates").delete().eq("id", id);
    if (deleteError) setError(deleteError.message); else await fetchItems();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Voucher Templates</h1><p className="text-muted-foreground">Reusable descriptions for AP Vouchers</p></div>
        <button type="button" onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" />New Template</button>
      </div>
      <div className="card p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search templates..." /></div></div>
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="card p-4">
        <div className="mb-4 flex gap-3"><input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} className="input-field flex-1" maxLength={100} placeholder="Template description" /><button type="button" onClick={save} disabled={saving} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Update" : "Add"}</button>{editing && <button type="button" onClick={startCreate} className="btn-outline">Cancel</button>}</div>
        <div className="table-container">
          <table className="data-table table-fixed">
            <colgroup><col className="w-16" /><col /><col className="w-24" /></colgroup>
            <thead><tr><th>#</th><th>Description</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={3} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : items.length === 0 ? <tr><td colSpan={3} className="py-10 text-center text-muted-foreground">No templates found</td></tr> : items.map((item, index) => (
                <tr key={item.id}><td>{index + 1}</td><td className="truncate">{item.description}</td><td><div className="flex justify-end gap-1"><button type="button" onClick={() => startEdit(item)} className="btn-ghost p-1" title="Edit"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => remove(item.id)} className="btn-ghost p-1 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button></div></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
