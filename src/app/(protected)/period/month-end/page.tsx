"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { closeMonth, reopenPeriod } from "@/modules/period/period.actions";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Lock, Unlock, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
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

interface VendorBalance {
  code: string;
  name_en: string;
  name_th: string | null;
  total_amount: number;
  total_payment: number;
  open_amount: number;
  balance: number;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MonthEndPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [vendorBalances, setVendorBalances] = useState<VendorBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [closeDialog, setCloseDialog] = useState(false);
  const [reopenDialog, setReopenDialog] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<{ vendorsProcessed: number; balancesCreated: number } | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
  const [yearFilter, setYearFilter] = useState(currentYear);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("periods")
      .select("id, period_year, period_month, date_from, date_to, closed")
      .eq("period_year", String(yearFilter))
      .order("period_month", { ascending: true });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setPeriods((data as Period[]) ?? []);
    }
    setLoading(false);
  }, [yearFilter, supabase]);

  const fetchBalances = useCallback(async () => {
    const { data } = await supabase
      .from("vendors")
      .select("code, name_en, name_th, total_amount, total_payment, open_amount")
      .eq("is_active", true)
      .order("code");

    if (data) {
      setVendorBalances(
        data.map((v) => ({
          code: v.code,
          name_en: v.name_en,
          name_th: v.name_th,
          total_amount: Number(v.total_amount) || 0,
          total_payment: Number(v.total_payment) || 0,
          open_amount: Number(v.open_amount) || 0,
          balance: (Number(v.total_amount) || 0) - (Number(v.total_payment) || 0),
        }))
      );
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  async function handleClosePeriod() {
    if (!selectedPeriod) return;
    setClosing(true);
    setMessage(null);
    setCloseResult(null);

    try {
      const result = await closeMonth({ periodId: selectedPeriod });
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Failed to close period" });
        return;
      }
      const data = result.data;
      setCloseResult({ vendorsProcessed: data.vendorsProcessed, balancesCreated: data.balancesCreated });
      setMessage({ type: "success", text: `Period ${data.periodMonth}/${data.periodYear} closed successfully. ${data.balancesCreated} balances saved.` });
      setCloseDialog(false);
      await fetchData();
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setClosing(false);
    }
  }

  async function handleReopenPeriod() {
    if (!reopenDialog) return;
    setReopening(true);
    setMessage(null);

    try {
      const result = await reopenPeriod({ periodId: reopenDialog });
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Failed to reopen period" });
        return;
      }
      setMessage({ type: "success", text: "Period reopened successfully." });
      setReopenDialog(null);
      await fetchData();
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setReopening(false);
    }
  }

  const totalBalance = vendorBalances.reduce((s, v) => s + v.balance, 0);
  const totalPayable = vendorBalances.reduce((s, v) => s + v.total_amount, 0);
  const totalPayments = vendorBalances.reduce((s, v) => s + v.total_payment, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Month-End Closing</h1>
          <p className="text-muted-foreground">Review vendor balances, calculate monthly totals, and close periods</p>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(Number(e.target.value)); setSelectedPeriod(""); }}
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

      {closeResult && (
        <div className="card p-4 bg-success-bg border-green-200">
          <h3 className="font-semibold text-success">Closing Results</h3>
          <p className="text-sm text-success">Vendors processed: {closeResult.vendorsProcessed}</p>
          <p className="text-sm text-success">Monthly balances saved: {closeResult.balancesCreated}</p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Select Period to Close</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading periods...</div>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No periods found for {yearFilter}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Date From</th>
                  <th>Date To</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{MONTH_NAMES[parseInt(p.period_month, 10) - 1]} {p.period_year}</td>
                    <td>{p.date_from}</td>
                    <td>{p.date_to}</td>
                    <td>
                      <span className={cn("badge", p.closed ? "badge-danger" : "badge-success")}>
                        {p.closed ? "Closed" : "Open"}
                      </span>
                    </td>
                    <td className="text-right">
                      {p.closed ? (
                        <button onClick={() => setReopenDialog(p.id)} className="btn-ghost gap-1 text-sm">
                          <Unlock className="h-4 w-4" /> Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelectedPeriod(p.id); setCloseDialog(true); }}
                          className="btn-ghost gap-1 text-sm text-destructive"
                        >
                          <Lock className="h-4 w-4" /> Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Vendor Balances (All Active)</h2>
          <p className="text-sm text-muted-foreground">{vendorBalances.length} vendors</p>
        </div>
        <div className="grid grid-cols-3 gap-4 border-b p-4">
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Total Payable</span>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalPayable)}</p>
          </div>
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Total Payments</span>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalPayments)}</p>
          </div>
          <div className="space-y-1">
            <span className="label-text text-muted-foreground">Outstanding Balance</span>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="data-table">
            <thead>
              <tr><th>Code</th><th>Name</th><th className="text-right">Total AP</th><th className="text-right">Payments</th><th className="text-right">Balance</th></tr>
            </thead>
            <tbody>
              {vendorBalances.map((v) => (
                <tr key={v.code}>
                  <td className="font-medium">{v.code}</td>
                  <td>{v.name_th || v.name_en}</td>
                  <td className="text-right font-mono">{formatCurrency(v.total_amount)}</td>
                  <td className="text-right font-mono">{formatCurrency(v.total_payment)}</td>
                  <td className="text-right font-mono font-semibold">{formatCurrency(v.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td colSpan={2}>Total</td>
                <td className="text-right font-mono">{formatCurrency(totalPayable)}</td>
                <td className="text-right font-mono">{formatCurrency(totalPayments)}</td>
                <td className="text-right font-mono">{formatCurrency(totalBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Period</DialogTitle>
            <DialogDescription>
              This will calculate and save monthly balances for all vendors, then close the period. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setCloseDialog(false)} className="btn-outline">Cancel</button>
            <button onClick={handleClosePeriod} className="btn-destructive" disabled={closing}>
              {closing && <Loader2 className="h-4 w-4 animate-spin" />}
              <Lock className="h-4 w-4" /> Close Period
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reopenDialog} onOpenChange={() => setReopenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Period</DialogTitle>
            <DialogDescription>Are you sure you want to reopen this period? This will allow transactions to be posted again.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setReopenDialog(null)} className="btn-outline">Cancel</button>
            <button onClick={handleReopenPeriod} className="btn-primary" disabled={reopening}>
              {reopening && <Loader2 className="h-4 w-4 animate-spin" />}
              <Unlock className="h-4 w-4" /> Reopen
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}