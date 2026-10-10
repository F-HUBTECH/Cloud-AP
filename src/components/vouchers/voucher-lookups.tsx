"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";

interface Template { id: string; description: string }
interface Account { code: string; name: string }

function LookupDialog({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} className="w-[calc(100%_-_2rem)] max-w-2xl rounded-lg border bg-[hsl(var(--card))] p-6 text-foreground shadow-lg backdrop:bg-black/40" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="btn-outline">Close (Esc)</button>
      </div>
      {children}
    </dialog>
  );
}

export function AccountLookup({ accounts, onSelect, onClose }: {
  accounts: Account[]; onSelect: (code: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = accounts.filter((a) => `${a.code} ${a.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <LookupDialog title="Look up Account Code" onClose={onClose}>
      <label className="label-text" htmlFor="account-search">Search code or account name</label>
      <input id="account-search" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} className="input-field mt-2" placeholder="Account Code / ชื่อบัญชี" />
      <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
        {filtered.length === 0 ? <p className="p-4 text-muted-foreground">No accounts found. Add active detail accounts in Settings → Chart of Accounts.</p> : filtered.map((a) => (
          <button key={a.code} type="button" onClick={() => onSelect(a.code)} className="flex w-full gap-4 rounded-md border p-3 text-left hover:bg-accent focus:bg-accent">
            <span className="w-32 shrink-0 font-medium">{a.code}</span><span>{a.name}</span>
          </button>
        ))}
      </div>
    </LookupDialog>
  );
}

export function TemplateLookup({ onSelect, onClose }: {
  onSelect: (description: string) => void; onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { roles } = usePermission();
  const canManage = roles.includes("ADMIN") || roles.includes("SUPERADMIN");
  const [items, setItems] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [edit, setEdit] = useState<{ id?: string; description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selected = items.find((t) => t.id === selectedId);
  const filtered = items.filter((t) => t.description.toLowerCase().includes(search.trim().toLowerCase()));
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("voucher_description_templates").select("id, description").order("created_at").order("id");
      if (error) throw error;
      setItems((data ?? []) as Template[]);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load templates"); }
    finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!edit || saving) return;
    const description = edit.description.trim();
    if (!description) { setError("Description is required"); return; }
    setSaving(true); setError(null);
    try {
      const result = edit.id
        ? await supabase.from("voucher_description_templates").update({ description }).eq("id", edit.id).select("id").single()
        : await supabase.from("voucher_description_templates").insert({ description }).select("id").single();
      if (result.error) throw result.error;
      setSelectedId(result.data.id); setEdit(null); setSearch(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save template"); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!selected || saving || !window.confirm(`Delete template "${selected.description}"?`)) return;
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.from("voucher_description_templates").delete().eq("id", selected.id).select("id").single();
      if (error) throw error;
      setSelectedId(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to delete template"); }
    finally { setSaving(false); }
  }
  return (
    <LookupDialog title="Look up Template Description" onClose={onClose}>
      <label className="label-text" htmlFor="template-search">Search description</label>
      <div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input id="template-search" autoFocus value={search} onChange={(e) => { setSearch(e.target.value); setSelectedId(""); }} className="input-field pl-10" placeholder="ค้นหาคำอธิบาย" /></div>
      {error && <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {canManage && <div className="my-4 flex flex-wrap gap-2">
        <button type="button" className="btn-outline" disabled={saving} onClick={() => { setEdit({ description: "" }); setError(null); }}><Plus className="h-4 w-4" />New</button>
        <button type="button" className="btn-outline" disabled={!selected || saving} onClick={() => selected && setEdit(selected)}><Pencil className="h-4 w-4" />Edit</button>
        <button type="button" className="btn-outline text-destructive" disabled={!selected || saving} onClick={remove}><Trash2 className="h-4 w-4" />Delete</button>
      </div>}
      {edit && <div className="my-4 space-y-2 rounded-md border p-3">
        <label className="label-text" htmlFor="template-description">Description</label>
        <input id="template-description" autoFocus value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }} maxLength={100} className="input-field" />
        <div className="flex gap-2"><button type="button" className="btn-primary" disabled={saving} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save Template</button><button type="button" disabled={saving} className="btn-outline" onClick={() => setEdit(null)}>Cancel</button></div>
      </div>}
      <p className="my-3 text-sm text-muted-foreground">เลือกข้อความแล้วกด Select, Enter หรือดับเบิลคลิก</p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {loading ? <Loader2 className="m-4 h-5 w-5 animate-spin" /> : filtered.length === 0 ? <p className="p-4 text-muted-foreground">No templates found</p> : filtered.map((t) => (
          <button key={t.id} type="button" disabled={saving || !!edit} onClick={() => setSelectedId(t.id)} onDoubleClick={() => onSelect(t.description)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSelect(t.description); } }} className={`block w-full rounded-md border p-3 text-left hover:bg-accent ${selectedId === t.id ? "border-primary bg-accent" : ""}`} aria-pressed={selectedId === t.id}>{t.description}</button>
        ))}
      </div>
      <div className="mt-4 flex justify-end"><button type="button" className="btn-primary" disabled={!selected || saving || !!edit} onClick={() => selected && onSelect(selected.description)}>Select</button></div>
    </LookupDialog>
  );
}
