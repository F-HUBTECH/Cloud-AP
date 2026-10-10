"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { closeYear } from "@/modules/period/period.actions";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Lock, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
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
  closed: boolean;
}

interface VendorBalance {
  code: string;
  name_en: string;
  name_th: string | null;
  total_amount: number;
  total_payment: number;
  balance: number;
}

export default function YearEndPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [vendorBalances, setVendorBalances] = useState<VendorBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearCompleted, setYearCompleted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [closeDialog, setCloseDialog] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const supabase = useMemo(() => createClient(), []);
  const yearOptions = [yearFilter - 1, yearFilter, yearFilter + 1];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: run, error: runError } = await supabase.from("year_end_runs")
      .select("id").eq("period_year", String(yearFilter)).maybeSingle();
    setYearCompleted(!!run);
    if (runError) setMessage({ type: "error", text: runError.message });
    const { data, error } = await supabase
      .from("periods")
      .select("id, period_year, period_month, closed")
      .eq("period_year", String(yearFilter))
      .order("period_month", { ascending: true });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setPeriods((data as Period[]) ?? []);
    }

    const { data: vendors, error: balanceError } = await supabase.rpc("ap_period_summary", {
      p_year: String(yearFilter),
    });
    if (balanceError) {
      setVendorBalances([]);
      setMessage({ type: "error", text: balanceError.message });
    } else {
      setVendorBalances((vendors ?? []) as VendorBalance[]);
    }
    setLoading(false);
  }, [yearFilter, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allClosed = periods.length > 0 && periods.every((p) => p.closed);

  const openCount = periods.filter((p) => !p.closed).length;
  const totalPayable = vendorBalances.reduce((s, v) => s + v.total_amount, 0);
  const totalPayments = vendorBalances.reduce((s, v) => s + v.total_payment, 0);
  const totalBalance = vendorBalances.reduce((s, v) => s + v.balance, 0);

  async function handleCloseYear() {
    setClosing(true);
    setMessage(null);

    try {
      const result = await closeYear({ year: String(yearFilter) });
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Failed to close year" });
        return;
      }
      const data = result.data;
      setMessage({
        type: "success",
        text: `Year ${yearFilter} closed successfully. ${data.vendorsProcessed} vendor balances archived and carried forward.${data.nextYearCreated ? ` Year ${yearFilter + 1} periods created.` : ""}`,
      });

      setCloseDialog(false);
      await fetchData();
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Year-End Closing</h1>
          <p className="text-muted-foreground">Archive the fiscal year and carry forward balances after all Month End processes</p>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="input-field w-32"
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {message && (
        <div className={cn("flex items-center gap-2 rounded-md p-3 text-sm", message.type === "success" ? "bg-success-bg text-success" : "bg-destructive/10 text-destructive")}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Fiscal Year {yearFilter} — Period Status</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No periods found for year {yearFilter}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Month</th><th>Status</th></tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">Month {p.period_month}</td>
                    <td><span className={cn("badge", p.closed ? "badge-danger" : "badge-success")}>{p.closed ? "Closed" : "Open"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-muted-foreground">
              {yearCompleted ? "Year End completed; balances carried forward." : allClosed ? "All periods are closed. Ready for Year End." : `${openCount} open period(s), ${periods.length - openCount} closed.`}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Year-End Summary</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Vendors</span>
            <p className="text-2xl font-bold">{vendorBalances.length}</p>
          </div>
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Total Payable</span>
            <p className="text-2xl font-bold font-mono">{formatCurrency(totalPayable)}</p>
          </div>
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Total Payments</span>
            <p className="text-2xl font-bold font-mono">{formatCurrency(totalPayments)}</p>
          </div>
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Outstanding Balance</span>
            <p className="text-2xl font-bold font-mono">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
      </div>

      {!yearCompleted && periods.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Close Year</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Complete Month End for every period first. Year End archives vendor balances, carries the final balance into January, and changes the current period to January {yearFilter + 1}.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 mb-4 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span>This action cannot be undone. Make sure all transactions for the year are posted.</span>
          </div>
          <button onClick={() => setCloseDialog(true)} className="btn-destructive" disabled={!allClosed || loading}>
            <Lock className="h-4 w-4" /> Close Fiscal Year {yearFilter}
          </button>
        </div>
      )}

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Fiscal Year {yearFilter}</DialogTitle>
            <DialogDescription>
              This will archive year {yearFilter}, carry forward balances and create any missing periods for {yearFilter + 1}. The current period will become January {yearFilter + 1}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setCloseDialog(false)} className="btn-outline">Cancel</button>
            <button onClick={handleCloseYear} className="btn-destructive" disabled={closing}>
              {closing && <Loader2 className="h-4 w-4 animate-spin" />}
              Close Year
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
