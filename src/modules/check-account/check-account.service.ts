import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { CheckAccountResult, CheckAccountParams, GLAccountBalance, VendorSubLedgerBalance } from "./check-account.types";

class CheckAccountService {
  private async getClient() {
    return createServerClient();
  }

  async getCheckAccountData(params: CheckAccountParams = {}): Promise<CheckAccountResult> {
    const supabase = await this.getClient();
    const { periodMonth, periodYear } = params;

    const invoiceQuery = supabase
      .from("invoices")
      .select("id, supplier_code, total_amount, dr_amount, cr_amount, balance, status, ap_type_code")
      .neq("status", "cancelled");

    const itemsQuery = supabase
      .from("invoice_items")
      .select("gl_account, dr_amount, cr_amount, invoice_id")
      .order("gl_account");

    const paymentItemsQuery = supabase
      .from("payment_items")
      .select("gl_account, dr_amount, cr_amount, payment_id");

    const paymentQuery = supabase
      .from("payments")
      .select("id, status")
      .neq("status", "cancelled");

    const depositItemsQuery = supabase
      .from("deposit_payment_items")
      .select("gl_account, dr_amount, cr_amount, deposit_id");

    const depositQuery = supabase
      .from("deposit_payments")
      .select("id, status")
      .neq("status", "cancelled");

    if (periodMonth) {
      void invoiceQuery.eq("period_month", periodMonth);
      void paymentQuery.eq("period_month", periodMonth);
      void depositQuery.eq("period_month", periodMonth);
    }
    if (periodYear) {
      void invoiceQuery.eq("period_year", periodYear);
      void paymentQuery.eq("period_year", periodYear);
      void depositQuery.eq("period_year", periodYear);
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
      invoiceQuery,
      itemsQuery,
      paymentItemsQuery,
      paymentQuery,
      depositItemsQuery,
      depositQuery,
      supabase.from("gl_accounts").select("code, name, account_type").eq("is_active", true).order("code"),
      supabase.from("vendors").select("code, name_en, name_th, total_amount, total_payment, open_amount").eq("is_active", true).order("code"),
    ]);

    if (invoicesResult.error) throw new AppError(invoicesResult.error.message);
    if (itemsResult.error) throw new AppError(itemsResult.error.message);
    if (paymentItemsResult.error) throw new AppError(paymentItemsResult.error.message);
    if (paymentsResult.error) throw new AppError(paymentsResult.error.message);
    if (depositItemsResult.error) throw new AppError(depositItemsResult.error.message);
    if (depositsResult.error) throw new AppError(depositsResult.error.message);
    if (glAccountsResult.error) throw new AppError(glAccountsResult.error.message);
    if (vendorsResult.error) throw new AppError(vendorsResult.error.message);

    const invoices = invoicesResult.data ?? [];
    const items = itemsResult.data ?? [];
    const paymentItems = paymentItemsResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const depositItems = depositItemsResult.data ?? [];
    const deposits = depositsResult.data ?? [];
    const glAccounts = glAccountsResult.data ?? [];
    const vendors = vendorsResult.data ?? [];

    const validInvoiceIds = new Set(invoices.map((i: Record<string, unknown>) => i.id as string));
    const validPaymentIds = new Set(payments.map((p: Record<string, unknown>) => p.id as string));
    const validDepositIds = new Set(deposits.map((d: Record<string, unknown>) => d.id as string));

    const filteredItems = (items as Record<string, unknown>[]).filter((item) => validInvoiceIds.has(item.invoice_id as string));
    const filteredPaymentItems = (paymentItems as Record<string, unknown>[]).filter((pi) => validPaymentIds.has(pi.payment_id as string));
    const filteredDepositItems = (depositItems as Record<string, unknown>[]).filter((di) => validDepositIds.has(di.deposit_id as string));

    const glMap = new Map<string, { dr: number; cr: number }>();

    const round = (n: number) => Math.round(n * 100) / 100;

    for (const item of filteredItems) {
      const acct = item.gl_account as string;
      if (!acct) continue;
      if (!glMap.has(acct)) glMap.set(acct, { dr: 0, cr: 0 });
      const entry = glMap.get(acct)!;
      entry.dr += Number(item.dr_amount) || 0;
      entry.cr += Number(item.cr_amount) || 0;
    }

    for (const pi of filteredPaymentItems) {
      const acct = pi.gl_account as string;
      if (!acct) continue;
      if (!glMap.has(acct)) glMap.set(acct, { dr: 0, cr: 0 });
      const entry = glMap.get(acct)!;
      entry.dr += Number(pi.dr_amount) || 0;
      entry.cr += Number(pi.cr_amount) || 0;
    }

    for (const di of filteredDepositItems) {
      const acct = di.gl_account as string;
      if (!acct) continue;
      if (!glMap.has(acct)) glMap.set(acct, { dr: 0, cr: 0 });
      const entry = glMap.get(acct)!;
      entry.dr += Number(di.dr_amount) || 0;
      entry.cr += Number(di.cr_amount) || 0;
    }

    const glBalances: GLAccountBalance[] = [];
    const glAccountNames = new Map(glAccounts.map((a: Record<string, unknown>) => [a.code as string, a.name as string]));

    const sortedGLCodes = [...glMap.keys()].sort();
    for (const code of sortedGLCodes) {
      const entry = glMap.get(code)!;
      const balance = entry.dr - entry.cr;
      glBalances.push({
        code,
        name: glAccountNames.get(code) ?? "",
        drTotal: round(entry.dr),
        crTotal: round(entry.cr),
        balance: round(balance),
      });
    }

    const vendorBalances: VendorSubLedgerBalance[] = (vendors as Record<string, unknown>[]).map((v) => {
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

    const glTotal = round(glBalances.reduce((sum, g) => sum + g.balance, 0));
    const apTotal = round(vendorBalances.reduce((sum, v) => sum + v.balance, 0));
    const difference = round(glTotal - apTotal);

    return {
      glBalances,
      vendorBalances,
      glTotal,
      apTotal,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
    };
  }
}

export const checkAccountService = new CheckAccountService();