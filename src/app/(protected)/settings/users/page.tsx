"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUser, updateUser, deleteUser } from "@/modules/auth/user.actions";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AppUser {
  id: string;
  login_name: string;
  display_name: string | null;
  department: string | null;
  is_active: boolean;
  expire_date: string | null;
}

interface UserFormData {
  login_name: string;
  display_name: string;
  department: string;
  is_active: boolean;
  expire_date: string;
}

const emptyForm: UserFormData = {
  login_name: "",
  display_name: "",
  department: "",
  is_active: true,
  expire_date: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("app_users").select("*").order("login_name");
    if (search) {
      query = query.or(
        `login_name.ilike.%${search}%,display_name.ilike.%${search}%,department.ilike.%${search}%`
      );
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setUsers((data as AppUser[]) ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(user: AppUser) {
    setEditingUser(user);
    setForm({
      login_name: user.login_name,
      display_name: user.display_name ?? "",
      department: user.department ?? "",
      is_active: user.is_active,
      expire_date: user.expire_date ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingUser) {
        const result = await updateUser(editingUser.id, form);
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await createUser(form);
        if (!result.success) throw new Error(result.error);
      }
      setDialogOpen(false);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const result = await deleteUser(deleteId);
      if (!result.success) throw new Error(result.error);
      setDeleteId(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage application users and permissions</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search users..."
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
              <th>Login Name</th>
              <th>Display Name</th>
              <th>Department</th>
              <th>Status</th>
              <th>Expire Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.login_name}</td>
                  <td>{user.display_name ?? "-"}</td>
                  <td>{user.department ?? "-"}</td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        user.is_active ? "badge-success" : "badge-danger"
                      )}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{user.expire_date ? formatDate(user.expire_date) : "-"}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="btn-ghost p-1"
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(user.id)}
                        className="btn-ghost p-1 text-destructive"
                        title="Delete user"
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
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Create a new application user"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="login_name" className="label-text">
                Login Name *
              </label>
              <input
                id="login_name"
                value={form.login_name}
                onChange={(e) => setForm((f) => ({ ...f, login_name: e.target.value }))}
                className="input-field"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="display_name" className="label-text">Display Name</label>
              <input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                className="input-field"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="department" className="label-text">Department</label>
              <input
                id="department"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="input-field"
                maxLength={100}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="is_active" className="label-text">Active</label>
            </div>
            <div className="space-y-2">
              <label htmlFor="expire_date" className="label-text">Expire Date</label>
              <input
                id="expire_date"
                type="date"
                value={form.expire_date}
                onChange={(e) => setForm((f) => ({ ...f, expire_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingUser ? "Update" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
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