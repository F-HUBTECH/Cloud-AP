"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { Lock, Unlock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Period {
  id: string;
  period_year: string;
  period_month: string;
  date_from: string;
  date_to: string;
  closed: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PeriodPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "close" | "reopen";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("periods")
      .select("*")
      .eq("period_year", String(yearFilter))
      .order("period_month", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPeriods((data as Period[]) ?? []);
    }
    setLoading(false);
  }, [yearFilter]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  async function handleToggleClose() {
    if (!confirmAction) return;
    setActionLoading(true);
    setError(null);

    try {
      const newStatus = confirmAction.action === "close";
      const { error: updateError } = await supabase
        .from("periods")
        .update({ closed: newStatus })
        .eq("id", confirmAction.id);

      if (updateError) throw updateError;
      setConfirmAction(null);
      await fetchPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update period status");
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Period Management</h1>
          <p className="text-muted-foreground">Manage accounting periods and closing status</p>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="input-field w-32"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Month</th>
              <th>Date From</th>
              <th>Date To</th>
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
            ) : periods.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No periods found for {yearFilter}
                </td>
              </tr>
            ) : (
              periods.map((period) => (
                <tr key={period.id}>
                  <td className="font-medium">{period.period_year}</td>
                  <td>{MONTH_NAMES[parseInt(period.period_month, 10) - 1] ?? period.period_month}</td>
                  <td>{formatDate(period.date_from)}</td>
                  <td>{formatDate(period.date_to)}</td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        period.closed ? "badge-danger" : "badge-success"
                      )}
                    >
                      {period.closed ? "Closed" : "Open"}
                    </span>
                  </td>
                  <td className="text-right">
                    {period.closed ? (
                      <button
                        onClick={() =>
                          setConfirmAction({ id: period.id, action: "reopen" })
                        }
                        className="btn-ghost gap-1 text-sm"
                        title="Reopen period"
                      >
                        <Unlock className="h-4 w-4" />
                        Reopen
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmAction({ id: period.id, action: "close" })
                        }
                        className="btn-ghost gap-1 text-sm"
                        title="Close period"
                      >
                        <Lock className="h-4 w-4" />
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "close" ? "Close Period" : "Reopen Period"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "close"
                ? "Are you sure you want to close this period? No further transactions can be posted to a closed period."
                : "Are you sure you want to reopen this period? This will allow transactions to be posted again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmAction(null)}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleToggleClose}
              className={confirmAction?.action === "close" ? "btn-destructive" : "btn-primary"}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmAction?.action === "close" ? "Close Period" : "Reopen Period"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}