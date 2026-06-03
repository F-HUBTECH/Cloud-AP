"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface GLBalance {
  code: string;
  name: string;
  drTotal: number;
  crTotal: number;
  balance: number;
}

interface VendorBalance {
  code: string;
  name_en: string;
  name_th: string | null;
  totalAmount: number;
  totalPayment: number;
  openAmount: number;
  balance: number;
}

interface Period {
  id: string;
  period_year: string;
  period_month: string;
  closed: boolean;
}

export default function CheckAccountPage() {
  const [periodMonth, setPeriodMonth] = useState("");
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear().toString());
  const [glBalances, setGLBalances] = useState<GLBalance[]>([]);
  const [vendorBalances, setVendorBalances] = useState<VendorBalance[]>([]);
  const [glTotal, setGLTotal] = useState(0);
  const [apTotal, setAPTotal] = useState(0);
  const [difference, setDifference] = useState(0);
  const [isBalanced, setIsBalanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase
      .from("periods")
      .select("id, period_year, period_month, closed")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (data) setPeriods(data as Period[]);
      });
  }, [supabase]);

  const runCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const invoicesQuery = supabase
        .from("invoices")
        .select("id, supplier_code, total_amount, dr_amount, cr_amount, balance, status, ap_type_code")
        .neq("status", "cancelled");

      const itemsQuery = supabase
        .from("invoice_items")
        .select("gl_account, dr_amount, cr_amount, invoice_id");

      const paymentItemsQuery = supabase
        .from("payment_items")
        .select("gl_account, dr_amount, cr_amount, payment_id");

      const paymentsQuery = supabase
        .from("payments")
        .select("id, status")
        .neq("status", "cancelled");

      const depositItemsQuery = supabase
        .from("deposit_payment_items")
        .select("gl_account, dr_amount, cr_amount, deposit_id");

      const depositsQuery = supabase
        .from("deposit_payments")
        .select("id, status")
        .neq("status", "cancelled");

      const glAccountsQuery = supabase
        .from("gl_accounts")
        .select("code, name, account_type")
        .eq("is_active", true)
        .order("code");

      const vendorsQuery = supabase
        .from("vendors")
        .select("code, name_en, name_th, total_amount, total_payment, open_amount")
        .eq("is_active", true)
        .order("code");

      if (periodMonth) {
        void invoicesQuery.eq("period_month", periodMonth);
        void paymentsQuery.eq("period_month", periodMonth);
        void depositsQuery.eq("period_month", periodMonth);
      }
      if (periodYear) {
        void invoicesQuery.eq("period_year", periodYear);
        void paymentsQuery.eq("period_year", periodYear);
        void depositsQuery.eq("period_year", periodYear);
      }

      const [
        invoicesResult,
        itemsResult,
        paymentItemsResult,
        paymentsResult,
        depositItemsResult,
        depositsResult,
        glAccountsResult,
        vendorsResult,
      ] = await Promise.all([
        invoicesQuery,
        itemsQuery,
        paymentItemsQuery,
        paymentsQuery,
        depositItemsQuery,
        depositsQuery,
        glAccountsQuery,
        vendorsQuery,
      ]);

      const invoices = invoicesResult.data ?? [];
      const items = itemsResult.data ?? [];
      const paymentItems = paymentItemsResult.data ?? [];
      const payments = paymentsResult.data ?? [];
      const depositItems = depositItemsResult.data ?? [];
      const deposits = depositsResult.data ?? [];
      const glAccounts = glAccountsResult.data ?? [];
      const vendors = vendorsResult.data ?? [];

      const validInvoiceIds = new Set(invoices.map((i: { id: string }) => i.id));
      const validPaymentIds = new Set(payments.map((p: { id: string }) => p.id));
      const validDepositIds = new Set(deposits.map((d: { id: string }) => d.id));

      const filteredItems = items.filter((item: { invoice_id: string }) => validInvoiceIds.has(item.invoice_id));
      const filteredPaymentItems = paymentItems.filter((pi: { payment_id: string }) => validPaymentIds.has(pi.payment_id));
      const filteredDepositItems = depositItems.filter((di: { deposit_id: string }) => validDepositIds.has(di.deposit_id));

      const glMap = new Map<string, { dr: number; cr: number }>();
      const round = (n: number) => Math.round(n * 100) / 100;

      for (const item of filteredItems) {
        const acct = (item as Record<string, unknown>).gl_account as string;
        if (!acct) continue;
        if (!glMap.has(acct)) glMap.set(acct, { dr: 0, cr: 0 });
        const entry = glMap.get(acct)!;
        entry.dr += Number((item as Record<string, unknown>).dr_amount) || 0;
        entry.cr += Number((item as Record<string, unknown>).cr_amount) || 0;
      }

      for (const pi of filteredPaymentItems) {
        const acct = (pi as Record<string, unknown>).gl_account as string;
        if (!acct) continue;
        if (!glMap.has(acct)) glMap.set(acct, { dr: 0, cr: 0 });
        const entry = glMap.get(acct)!;
        entry.dr += Number((pi as Record<string, unknown>).dr_amount) || 0;
        entry.cr += Number((pi as Record<string, unknown>).cr_amount) || 0;
      }

      for (const di of filteredDepositItems) {
        const acct = (di as Record<string, unknown>).gl_account as string;
        if (!acct) continue;
        if (!glMap.has(acct)) glMap.set(acct, { dr: 0, cr: 0 });
        const entry = glMap.get(acct)!;
        entry.dr += Number((di as Record<string, unknown>).dr_amount) || 0;
        entry.cr += Number((di as Record<string, unknown>).cr_amount) || 0;
      }

      const glAccountNames = new Map(glAccounts.map((a: { code: string; name: string }) => [a.code, a.name]));

      const glBalancesResult: GLBalance[] = [];
      const sortedGLCodes = [...glMap.keys()].sort();
      for (const code of sortedGLCodes) {
        const entry = glMap.get(code)!;
        const balance = entry.dr - entry.cr;
        glBalancesResult.push({
          code,
          name: glAccountNames.get(code) ?? "",
          drTotal: round(entry.dr),
          crTotal: round(entry.cr),
          balance: round(balance),
        });
      }

      const vendorBalancesResult: VendorBalance[] = vendors.map((v: Record<string, unknown>) => {
        const totalAmount = Number(v.total_amount) || 0;
        const totalPayment = Number(v.total_payment) || 0;
        const openAmount = Number(v.open_amount) || 0;
        const balance = totalAmount - totalPayment + openAmount;
        return {
          code: v.code as string,
          name_en: v.name_en as string,
          name_th: v.name_th as string | null,
          totalAmount: round(totalAmount),
          totalPayment: round(totalPayment),
          openAmount: round(openAmount),
          balance: round(balance),
        };
      });

      const calculatedGLTotal = round(glBalancesResult.reduce((sum, g) => sum + g.balance, 0));
      const calculatedAPTotal = round(vendorBalancesResult.reduce((sum, v) => sum + v.balance, 0));
      const calculatedDifference = round(calculatedGLTotal - calculatedAPTotal);

      setGLBalances(glBalancesResult);
      setVendorBalances(vendorBalancesResult);
      setGLTotal(calculatedGLTotal);
      setAPTotal(calculatedAPTotal);
      setDifference(calculatedDifference);
      setIsBalanced(Math.abs(calculatedDifference) < 0.01);
      setHasRun(true);
    } finally {
      setIsLoading(false);
    }
  }, [periodMonth, periodYear, supabase]);

  const totalGLDr = glBalances.reduce((s, r) => s + r.drTotal, 0);
  const totalGLCr = glBalances.reduce((s, r) => s + r.crTotal, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check Account</h1>
        <p className="text-muted-foreground">
          Verify GL control account balance vs AP sub-ledger balance
        </p>
      </div>

      <div className="card p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <label htmlFor="period_year" className="label-text">Year</label>
            <input
              id="period_year"
              type="number"
              min="2000"
              max="2100"
              value={periodYear}
              onChange={(e) => setPeriodYear(e.target.value)}
              className="input-field w-28"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="period_month" className="label-text">Month</label>
            <select
              id="period_month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="input-field w-36"
            >
              <option value="">All Months</option>
              {periods
                .filter((p) => !periodYear || p.period_year === periodYear)
                .map((p) => (
                  <option key={p.id} value={p.period_month}>
                    {p.period_year}-{p.period_month}
                    {p.closed ? " (Closed)" : ""}
                  </option>
                ))}
            </select>
          </div>
          <button onClick={runCheck} disabled={isLoading} className="btn-primary">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "Run Check"
            )}
          </button>
        </div>
      </div>

      {hasRun && (
        <>
          <div className={cn("card p-6", isBalanced ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50")}>
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-green-800">Balanced</h2>
                    <p className="text-green-700">GL control account matches AP sub-ledger.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <h2 className="text-xl font-bold text-red-800">Out of Balance</h2>
                    <p className="text-red-700">
                      Difference: {formatCurrency(Math.abs(difference))} (GL: {formatCurrency(glTotal)}, AP: {formatCurrency(apTotal)})
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">GL Control Total</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(glTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AP Sub-ledger Total</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(apTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={cn("text-2xl font-bold font-mono", Math.abs(difference) < 0.01 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(difference)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">GL Account Balances</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Name</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glBalances.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No GL entries found</td></tr>
                    ) : (
                      glBalances.map((row) => (
                        <tr key={row.code}>
                          <td className="font-mono">{row.code}</td>
                          <td>{row.name}</td>
                          <td className="text-right font-mono">{formatCurrency(row.drTotal)}</td>
                          <td className="text-right font-mono">{formatCurrency(row.crTotal)}</td>
                          <td className={cn("text-right font-mono font-semibold", row.balance >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(row.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {glBalances.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={2} className="text-right">Total</td>
                        <td className="text-right font-mono">{formatCurrency(totalGLDr)}</td>
                        <td className="text-right font-mono">{formatCurrency(totalGLCr)}</td>
                        <td className={cn("text-right font-mono", glTotal >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(glTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Vendor Sub-ledger Balances</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th className="text-right">Open Amt</th>
                      <th className="text-right">Total Amt</th>
                      <th className="text-right">Paid</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorBalances.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No vendors found</td></tr>
                    ) : (
                      vendorBalances.map((row) => (
                        <tr key={row.code}>
                          <td className="font-medium">{row.code}</td>
                          <td>{row.name_th || row.name_en}</td>
                          <td className="text-right font-mono">{formatCurrency(row.openAmount)}</td>
                          <td className="text-right font-mono">{formatCurrency(row.totalAmount)}</td>
                          <td className="text-right font-mono">{formatCurrency(row.totalPayment)}</td>
                          <td className={cn("text-right font-mono font-semibold", row.balance >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(row.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {vendorBalances.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={2} className="text-right">Total</td>
                        <td className="text-right font-mono">
                          {formatCurrency(vendorBalances.reduce((s, r) => s + r.openAmount, 0))}
                        </td>
                        <td className="text-right font-mono">
                          {formatCurrency(vendorBalances.reduce((s, r) => s + r.totalAmount, 0))}
                        </td>
                        <td className="text-right font-mono">
                          {formatCurrency(vendorBalances.reduce((s, r) => s + r.totalPayment, 0))}
                        </td>
                        <td className={cn("text-right font-mono", apTotal >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(apTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}