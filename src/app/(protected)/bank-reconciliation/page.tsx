"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { createBankReconciliation, cancelBankReconciliation, reconcileCheque } from "@/modules/bank/bank.actions";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { Plus, Search, Loader2, XCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Reconciliation {
  id: string;
  bank_code: string;
  received_date: string;
  amount: number;
  status: string;
  cancelled: boolean;
  cancelled_at: string | null;
  remark: string | null;
  created_at: string;
}

interface ChequeTransaction {
  id: string;
  payment_id: string;
  bank_code: string;
  bank_name: string;
  cheque_date: string;
  cheque_number: string;
  remark: string | null;
  amount: number;
  cancelled: boolean;
  created_at: string;
}

interface BankAccount {
  id: string;
  code: string;
  name: string;
  account_no: string;
  is_active: boolean;
}

const statusColorMap: Record<string, string> = {
  open: "badge-warning",
  reconciled: "badge-success",
  cancelled: "badge-danger",
  cleared: "badge-success",
  outstanding: "badge-warning",
  bounced: "badge-danger",
};

export default function BankReconciliationPage() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [cheques, setCheques] = useState<ChequeTransaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [form, setForm] = useState({
    bank_code: "",
    received_date: new Date().toISOString().slice(0, 10),
    amount: "",
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchReconciliations = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("bank_reconciliations")
      .select("id, bank_code, received_date, amount, status, cancelled, cancelled_at, remark, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReconciliations(
        (data ?? []).map((r) => ({
          ...r,
          amount: Number(r.amount) || 0,
        }))
      );
    }
  }, [supabase]);

  const fetchCheques = useCallback(async () => {
    let query = supabase
      .from("cheque_transactions")
      .select("id, payment_id, bank_code, bank_name, cheque_date, cheque_number, remark, cancelled, created_at")
      .order("cheque_date", { ascending: false })
      .limit(100);

    if (statusFilter === "cleared") {
      query = query.like("remark", "%[CLEARED]%");
    } else if (statusFilter === "outstanding") {
      query = query.not("remark", "like", "%[CLEARED]%");
    }

    if (search) {
      query = query.or(
        `cheque_number.ilike.%${search}%,bank_code.ilike.%${search}%,bank_name.ilike.%${search}%`
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCheques((data ?? []) as ChequeTransaction[]);
    }
  }, [search, statusFilter, supabase]);

  const fetchBanks = useCallback(async () => {
    const { data } = await supabase
      .from("bank_accounts")
      .select("id, code, name, account_no, is_active")
      .eq("is_active", true)
      .order("code");
    if (data) setBanks(data as BankAccount[]);
  }, [supabase]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchReconciliations(), fetchCheques(), fetchBanks()]).finally(() =>
      setLoading(false)
    );
  }, [fetchReconciliations, fetchCheques, fetchBanks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const amount = parseFloat(form.amount) || 0;
      if (amount <= 0) {
        setError("Book balance must be greater than zero");
        return;
      }

      if (!form.bank_code) {
        setError("Please select a bank account");
        return;
      }

      const result = await createBankReconciliation({
        bankCode: form.bank_code,
        statementDate: form.received_date,
        bookBalance: amount,
        status: "open",
        remark: `Bank reconciliation for ${form.bank_code}`,
        receivedDate: form.received_date,
        amount,
        cheques: [],
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create reconciliation");
        return;
      }

      setDialogOpen(false);
      setForm({
        bank_code: "",
        received_date: new Date().toISOString().slice(0, 10),
        amount: "",
      });
      await fetchReconciliations();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelReconciliation() {
    if (!cancelId) return;
    setCancelLoading(true);
    setError(null);

    try {
      const result = await cancelBankReconciliation(cancelId, "Cancelled by user");
      if (!result.success) {
        setError(result.error ?? "Failed to cancel reconciliation");
      } else {
        await fetchReconciliations();
      }
      setCancelId(null);
    } catch {
      setError("An unexpected error occurred");
      setCancelId(null);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReconcileCheque() {
    if (!reconcileId) return;
    setReconcileLoading(true);
    setError(null);

    try {
      const result = await reconcileCheque(reconcileId);
      if (!result.success) {
        setError(result.error ?? "Failed to reconcile cheque");
      } else {
        setReconcileId(null);
        await fetchCheques();
      }
    } catch {
      setError("An unexpected error occurred");
      setReconcileId(null);
    } finally {
      setReconcileLoading(false);
    }
  }

  const activeReconciliations = reconciliations.filter((r) => !r.cancelled);
  const cancelledReconciliations = reconciliations.filter((r) => r.cancelled);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">
            Manage cheque reconciliation and bank clearing
          </p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Reconciliation
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Reconciliations List */}
      {activeReconciliations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Open Reconciliations</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bank Code</th>
                  <th>Statement Date</th>
                  <th className="text-right">Book Balance</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeReconciliations.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.bank_code}</td>
                    <td>{formatDate(r.received_date)}</td>
                    <td className="text-right font-mono">{formatCurrency(r.amount)}</td>
                    <td>
                      <span
                        className={cn(
                          "badge",
                          statusColorMap[r.status] ?? "badge-info"
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{formatDate(r.created_at, "dd/MM/yyyy HH:mm")}</td>
                    <td className="text-right">
                      <button
                        onClick={() => setCancelId(r.id)}
                        className="btn-ghost gap-1 text-sm text-destructive"
                        title="Cancel reconciliation"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cancelledReconciliations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-muted-foreground">Cancelled Reconciliations</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bank Code</th>
                  <th>Statement Date</th>
                  <th className="text-right">Book Balance</th>
                  <th>Status</th>
                  <th>Cancelled At</th>
                </tr>
              </thead>
              <tbody>
                {cancelledReconciliations.map((r) => (
                  <tr key={r.id} className="opacity-60">
                    <td className="font-medium">{r.bank_code}</td>
                    <td>{formatDate(r.received_date)}</td>
                    <td className="text-right font-mono">{formatCurrency(r.amount)}</td>
                    <td>
                      <span className="badge badge-danger">cancelled</span>
                    </td>
                    <td className="text-muted-foreground">
                      {r.cancelled_at ? formatDate(r.cancelled_at, "dd/MM/yyyy HH:mm") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cheque Transactions */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Cheque Transactions</h2>
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by cheque number, bank code, or bank name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-44"
            >
              <option value="">All Status</option>
              <option value="outstanding">Outstanding</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Cheque No.</th>
                <th>Cheque Date</th>
                <th>Remark</th>
                <th>Status</th>
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
              ) : cheques.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No cheques found
                  </td>
                </tr>
              ) : (
                cheques.map((c) => {
                  const isCleared = c.remark?.includes("[CLEARED]") ?? false;
                  return (
                    <tr key={c.id} className={cn(c.cancelled && "opacity-60")}>
                      <td>
                        <span className="font-medium">{c.bank_code}</span>
                        <span className="ml-2 text-muted-foreground">
                          {c.bank_name}
                        </span>
                      </td>
                      <td className="font-mono">{c.cheque_number}</td>
                      <td>{formatDate(c.cheque_date)}</td>
                      <td className="max-w-[200px] truncate">{c.remark ?? "-"}</td>
                      <td>
                        {c.cancelled ? (
                          <span className="badge badge-danger">cancelled</span>
                        ) : isCleared ? (
                          <span className="badge badge-success">cleared</span>
                        ) : (
                          <span className="badge badge-warning">outstanding</span>
                        )}
                      </td>
                      <td className="text-right">
                        {!c.cancelled && !isCleared && (
                          <button
                            onClick={() => setReconcileId(c.id)}
                            className="btn-ghost gap-1 text-sm text-green-600"
                            title="Mark as reconciled"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Reconciliation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Bank Reconciliation</DialogTitle>
            <DialogDescription>Create a new bank reconciliation record</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <label htmlFor="bank_code" className="label-text">Bank Account *</label>
              <select
                id="bank_code"
                value={form.bank_code}
                onChange={(e) => setForm((f) => ({ ...f, bank_code: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select bank account...</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code} - {b.name} ({b.account_no})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="received_date" className="label-text">Statement Date *</label>
              <input
                id="received_date"
                type="date"
                value={form.received_date}
                onChange={(e) => setForm((f) => ({ ...f, received_date: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="amount" className="label-text">Book Balance *</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="input-field text-right"
                placeholder="0.00"
                required
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                Create Reconciliation
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Reconciliation Dialog */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reconciliation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reconciliation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setCancelId(null)} className="btn-outline">No, Keep It</button>
            <button onClick={handleCancelReconciliation} className="btn-destructive" disabled={cancelLoading}>
              {cancelLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, Cancel Reconciliation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconcile Cheque Confirmation Dialog */}
      <Dialog open={!!reconcileId} onOpenChange={() => setReconcileId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Cheque</DialogTitle>
            <DialogDescription>
              Mark this cheque as cleared? The remark will be updated to include [CLEARED].
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setReconcileId(null)} className="btn-outline">No, Cancel</button>
            <button onClick={handleReconcileCheque} className="btn-primary" disabled={reconcileLoading}>
              {reconcileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Yes, Reconcile
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}