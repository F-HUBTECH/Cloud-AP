import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { roundAmount } from "@/lib/utils/format";
import type { APAgingReport, APAgingItem, VendorCardReport, VendorCardTransaction, DetailLedgerReport, DetailLedgerEntry, DashboardStats, RecentTransaction, APAgingParams, VendorCardParams, DetailLedgerParams, PaymentRegisterReport, PaymentRegisterItem, PaymentRegisterParams, InvoiceRegisterReport, InvoiceRegisterItem, InvoiceRegisterParams, VendorBalanceReport, VendorBalanceItem } from "./report.types";

class ReportService {
  private async getClient() {
    return createServerClient();
  }

  async getAgingData(params: APAgingParams): Promise<APAgingReport> {
    const supabase = await this.getClient();
    const { asOfDate, supplierCode } = params;

    let query = supabase
      .from("invoices")
      .select("id, doc_number, doc_date, supplier_code, due_date, total_amount, balance, status")
      .neq("status", "cancelled");

    if (supplierCode) {
      query = query.eq("supplier_code", supplierCode);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    const supplierCodes = [...new Set((data ?? []).map(row => row.supplier_code))];
    const supplierMap = new Map<string, string>();
    if (supplierCodes.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("code, name_en")
        .in("code", supplierCodes);
      for (const v of vendors ?? []) {
        supplierMap.set(v.code, v.name_en ?? "");
      }
    }

    const asOf = new Date(asOfDate);
    const supplierAggMap = new Map<string, APAgingItem>();

    for (const row of data ?? []) {
      const outstanding = row.balance ?? 0;
      if (outstanding <= 0) continue;

      const supCode = row.supplier_code;
      if (!supplierAggMap.has(supCode)) {
        supplierAggMap.set(supCode, {
          supplierCode: supCode,
          supplierName: supplierMap.get(supCode) ?? "",
          currentAmount: 0,
          overdue1To30: 0,
          overdue31To60: 0,
          overdue61To90: 0,
          overdue91Plus: 0,
          totalOutstanding: 0,
        });
      }

      const item = supplierAggMap.get(supCode)!;
      const dueDate = new Date(row.due_date);
      const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        item.currentAmount += outstanding;
      } else if (daysOverdue <= 30) {
        item.overdue1To30 += outstanding;
      } else if (daysOverdue <= 60) {
        item.overdue31To60 += outstanding;
      } else if (daysOverdue <= 90) {
        item.overdue61To90 += outstanding;
      } else {
        item.overdue91Plus += outstanding;
      }
      item.totalOutstanding += outstanding;
    }

    const items = Array.from(supplierAggMap.values());

    return {
      asOfDate,
      items: items.map(item => ({
        ...item,
        currentAmount: roundAmount(item.currentAmount),
        overdue1To30: roundAmount(item.overdue1To30),
        overdue31To60: roundAmount(item.overdue31To60),
        overdue61To90: roundAmount(item.overdue61To90),
        overdue91Plus: roundAmount(item.overdue91Plus),
        totalOutstanding: roundAmount(item.totalOutstanding),
      })),
      totalCurrent: roundAmount(items.reduce((sum, i) => sum + i.currentAmount, 0)),
      totalOverdue1To30: roundAmount(items.reduce((sum, i) => sum + i.overdue1To30, 0)),
      totalOverdue31To60: roundAmount(items.reduce((sum, i) => sum + i.overdue31To60, 0)),
      totalOverdue61To90: roundAmount(items.reduce((sum, i) => sum + i.overdue61To90, 0)),
      totalOverdue91Plus: roundAmount(items.reduce((sum, i) => sum + i.overdue91Plus, 0)),
      grandTotal: roundAmount(items.reduce((sum, i) => sum + i.totalOutstanding, 0)),
    };
  }

  async getVendorCardData(params: VendorCardParams): Promise<VendorCardReport> {
    const supabase = await this.getClient();
    const { supplierCode, periodMonth, periodYear } = params;

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, code, name_en")
      .eq("code", supplierCode)
      .single();

    if (!vendor) throw new AppError("Vendor not found", "NOT_FOUND", 404);

    let openingBalance = 0;
    const periodMonthNum = parseInt(periodMonth, 10);
    const periodYearNum = parseInt(periodYear, 10);

    const { data: monthlyBalance } = await supabase
      .from("vendor_monthly_balances")
      .select("opening_balance")
      .eq("vendor_id", vendor.id)
      .eq("period_month", periodMonthNum)
      .eq("period_year", periodYearNum)
      .maybeSingle();

    openingBalance = (monthlyBalance as Record<string, unknown> | null)?.opening_balance as number ?? 0;

    const { data: transactions, error } = await supabase
      .from("invoices")
      .select("doc_number, doc_date, supplier_code, ap_type_code, inv_number, dr_amount, cr_amount, remark")
      .eq("supplier_code", supplierCode)
      .eq("period_month", periodMonth)
      .eq("period_year", periodYear)
      .neq("status", "cancelled")
      .order("doc_date", { ascending: true });

    if (error) throw new AppError(error.message);

    let runningBalance = openingBalance;
    const entries: VendorCardTransaction[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const row of transactions ?? []) {
      const debit = row.dr_amount ?? 0;
      const credit = row.cr_amount ?? 0;
      runningBalance += debit - credit;
      totalDebit += debit;
      totalCredit += credit;

      entries.push({
        documentNumber: row.doc_number,
        documentDate: row.doc_date,
        transactionType: row.ap_type_code,
        invoiceNumber: row.inv_number,
        debit,
        credit,
        balance: Math.round(runningBalance * 100) / 100,
        remark: row.remark,
      });
    }

    const closingBalance = openingBalance + totalDebit - totalCredit;

    return {
      supplierCode,
      supplierName: vendor.name_en ?? "",
      periodMonth,
      periodYear,
      openingBalance: Math.round(openingBalance * 100) / 100,
      transactions: entries,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
    };
  }

  async getDetailLedgerData(params: DetailLedgerParams): Promise<DetailLedgerReport> {
    const supabase = await this.getClient();
    const { accountNumber, periodMonth, periodYear, supplierCode } = params;

    const { data: account } = await supabase
      .from("gl_accounts")
      .select("code, name")
      .eq("code", accountNumber)
      .single();

    if (!account) throw new AppError("Account not found", "NOT_FOUND", 404);

    let invoiceQuery = supabase
      .from("invoices")
      .select("id, doc_number, doc_date, supplier_code, ap_type_code, remark")
      .neq("status", "cancelled")
      .eq("period_month", periodMonth)
      .eq("period_year", periodYear);

    if (supplierCode) {
      invoiceQuery = invoiceQuery.eq("supplier_code", supplierCode);
    }

    const { data: invoices, error: invoiceError } = await invoiceQuery;
    if (invoiceError) throw new AppError(invoiceError.message);

    if (!invoices || invoices.length === 0) {
      return {
        accountNumber,
        accountName: account.name,
        periodMonth,
        periodYear,
        openingBalance: 0,
        entries: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      };
    }

    const invoiceIds = invoices.map(inv => inv.id);

    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("gl_account, dr_amount, cr_amount, description, invoice_id")
      .in("invoice_id", invoiceIds)
      .eq("gl_account", accountNumber);

    if (itemsError) throw new AppError(itemsError.message);

    const invoiceMap = new Map(invoices.map(inv => [inv.id, inv]));

    const supplierCodes = [...new Set(invoices.map(inv => inv.supplier_code))];
    const supplierNameMap = new Map<string, string>();
    if (supplierCodes.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("code, name_en")
        .in("code", supplierCodes);
      for (const v of vendors ?? []) {
        supplierNameMap.set(v.code, v.name_en ?? "");
      }
    }

    const entries: DetailLedgerEntry[] = [];
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const item of items ?? []) {
      const invoice = invoiceMap.get(item.invoice_id);
      if (!invoice) continue;

      const debit = item.dr_amount ?? 0;
      const credit = item.cr_amount ?? 0;
      runningBalance += debit - credit;
      totalDebit += debit;
      totalCredit += credit;

      entries.push({
        documentNumber: invoice.doc_number ?? "",
        documentDate: invoice.doc_date ?? "",
        accountNumber,
        accountName: account.name,
        supplierCode: invoice.supplier_code ?? "",
        supplierName: supplierNameMap.get(invoice.supplier_code) ?? "",
        debit,
        credit,
        balance: Math.round(runningBalance * 100) / 100,
        remark: invoice.remark ?? item.description ?? null,
        transactionType: invoice.ap_type_code ?? "",
      });
    }

    return {
      accountNumber,
      accountName: account.name,
      periodMonth,
      periodYear,
      openingBalance: 0,
      entries,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      closingBalance: Math.round(runningBalance * 100) / 100,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const supabase = await this.getClient();

    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, doc_number, doc_date, supplier_code, total_amount, balance, due_date, status, ap_type_code, updated_at")
      .neq("status", "cancelled");

    const totalPayable = invoices?.reduce((sum, t) => sum + (t.balance ?? 0), 0) ?? 0;
    const today = new Date();
    const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const overdue = invoices?.filter(t => new Date(t.due_date) < today && (t.balance ?? 0) > 0) ?? [];
    const upcomingDue = invoices?.filter(t => {
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate <= oneWeek && (t.balance ?? 0) > 0;
    }) ?? [];

    const { data: pendingApprovals } = await supabase
      .from("approvals")
      .select("id")
      .eq("status", "pending");

    const { data: debitNotes } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("ap_type_code", "ADN")
      .neq("status", "cancelled");

    const { data: deposits } = await supabase
      .from("deposit_payments")
      .select("amount")
      .neq("status", "cancelled");

    const yearMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
    const { data: paidThisMonth } = await supabase
      .from("payments")
      .select("total_net")
      .neq("status", "cancelled")
      .like("paid_at", `${yearMonth}%`);

    const recentTransactions: RecentTransaction[] = (invoices ?? [])
      .sort((a, b) => new Date(b.doc_date ?? b.updated_at).getTime() - new Date(a.doc_date ?? a.updated_at).getTime())
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        documentNumber: t.doc_number,
        documentDate: t.doc_date,
        supplierCode: t.supplier_code,
        supplierName: "",
        amount: t.total_amount ?? 0,
        transactionType: t.ap_type_code,
        status: t.status,
      }));

    const supplierCodes = [...new Set(recentTransactions.map(rt => rt.supplierCode).filter(Boolean))];
    if (supplierCodes.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("code, name_en")
        .in("code", supplierCodes);
      for (const v of vendors ?? []) {
        for (const rt of recentTransactions) {
          if (rt.supplierCode === v.code) {
            rt.supplierName = v.name_en ?? "";
          }
        }
      }
    }

    return {
      totalPayable: roundAmount(totalPayable),
      totalOverdue: roundAmount(overdue.reduce((sum, t) => sum + (t.balance ?? 0), 0)),
      totalPaidThisMonth: roundAmount(paidThisMonth?.reduce((sum, p) => sum + (p.total_net ?? 0), 0) ?? 0),
      totalPendingApproval: pendingApprovals?.length ?? 0,
      totalDebitNotes: roundAmount(debitNotes?.reduce((sum, d) => sum + (d.total_amount ?? 0), 0) ?? 0),
      totalDeposits: roundAmount(deposits?.reduce((sum, d) => sum + (d.amount ?? 0), 0) ?? 0),
      outstandingInvoices: invoices?.filter(t => (t.balance ?? 0) > 0).length ?? 0,
      upcomingDueThisWeek: upcomingDue.length,
      recentTransactions,
    };
  }

  async getPaymentRegister(params: PaymentRegisterParams): Promise<PaymentRegisterReport> {
    const supabase = await this.getClient();
    const { dateFrom, dateTo, supplierCode, status } = params;

    let query = supabase
      .from("payments")
      .select("id, doc_number, doc_date, supplier_code, pay_method, cheque_number, total_amount, total_wht, total_vat, total_net, status")
      .gte("doc_date", dateFrom)
      .lte("doc_date", dateTo)
      .order("doc_date", { ascending: true });

    if (supplierCode) query = query.eq("supplier_code", supplierCode);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    const supplierCodes = [...new Set((data ?? []).map((r: Record<string, unknown>) => r.supplier_code as string))];
    const supplierMap = new Map<string, string>();
    if (supplierCodes.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("code, name_en")
        .in("code", supplierCodes);
      for (const v of vendors ?? []) {
        supplierMap.set(v.code, v.name_en ?? "");
      }
    }

    const items: PaymentRegisterItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      docNumber: row.doc_number as string,
      docDate: row.doc_date as string,
      supplierCode: row.supplier_code as string,
      supplierName: supplierMap.get(row.supplier_code as string) ?? "",
      payMethod: row.pay_method as string,
      chequeNumber: row.cheque_number as string | null,
      totalAmount: roundAmount(Number(row.total_amount) || 0),
      totalWht: roundAmount(Number(row.total_wht) || 0),
      totalVat: roundAmount(Number(row.total_vat) || 0),
      totalNet: roundAmount(Number(row.total_net) || 0),
      status: row.status as string,
    }));

    return {
      dateFrom,
      dateTo,
      items,
      totalAmount: roundAmount(items.reduce((s, i) => s + i.totalAmount, 0)),
      totalWht: roundAmount(items.reduce((s, i) => s + i.totalWht, 0)),
      totalVat: roundAmount(items.reduce((s, i) => s + i.totalVat, 0)),
      totalNet: roundAmount(items.reduce((s, i) => s + i.totalNet, 0)),
    };
  }

  async getInvoiceRegister(params: InvoiceRegisterParams): Promise<InvoiceRegisterReport> {
    const supabase = await this.getClient();
    const { dateFrom, dateTo, supplierCode, apTypeCode, status } = params;

    let query = supabase
      .from("invoices")
      .select("id, doc_number, doc_date, supplier_code, inv_number, ap_type_code, total_amount, vat_amount, wht_amount, balance, status")
      .gte("doc_date", dateFrom)
      .lte("doc_date", dateTo)
      .order("doc_date", { ascending: true });

    if (supplierCode) query = query.eq("supplier_code", supplierCode);
    if (apTypeCode) query = query.eq("ap_type_code", apTypeCode);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    const supplierCodes = [...new Set((data ?? []).map((r: Record<string, unknown>) => r.supplier_code as string))];
    const supplierMap = new Map<string, string>();
    if (supplierCodes.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("code, name_en")
        .in("code", supplierCodes);
      for (const v of vendors ?? []) {
        supplierMap.set(v.code, v.name_en ?? "");
      }
    }

    const items: InvoiceRegisterItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      docNumber: row.doc_number as string,
      docDate: row.doc_date as string,
      supplierCode: row.supplier_code as string,
      supplierName: supplierMap.get(row.supplier_code as string) ?? "",
      invNumber: row.inv_number as string | null,
      apTypeCode: row.ap_type_code as string | null,
      totalAmount: roundAmount(Number(row.total_amount) || 0),
      vatAmount: roundAmount(Number(row.vat_amount) || 0),
      whtAmount: roundAmount(Number(row.wht_amount) || 0),
      balance: roundAmount(Number(row.balance) || 0),
      status: row.status as string,
    }));

    return {
      dateFrom,
      dateTo,
      items,
      totalAmount: roundAmount(items.reduce((s, i) => s + i.totalAmount, 0)),
      totalVat: roundAmount(items.reduce((s, i) => s + i.vatAmount, 0)),
      totalWht: roundAmount(items.reduce((s, i) => s + i.whtAmount, 0)),
      totalBalance: roundAmount(items.reduce((s, i) => s + i.balance, 0)),
    };
  }

  async getVendorBalance(): Promise<VendorBalanceReport> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("vendors")
      .select("code, name_en, name_th, total_amount, total_payment, open_amount")
      .eq("is_active", true)
      .order("code");

    if (error) throw new AppError(error.message);

    const items: VendorBalanceItem[] = (data ?? []).map((row: Record<string, unknown>) => {
      const totalAmount = Number(row.total_amount) || 0;
      const totalPayment = Number(row.total_payment) || 0;
      const openAmount = Number(row.open_amount) || 0;
      const balance = totalAmount - totalPayment + openAmount;

      return {
        code: row.code as string,
        name_en: row.name_en as string,
        name_th: row.name_th as string | null,
        totalAmount: roundAmount(totalAmount),
        totalPayment: roundAmount(totalPayment),
        openAmount: roundAmount(openAmount),
        balance: roundAmount(balance),
      };
    });

    return {
      items,
      totalAmount: roundAmount(items.reduce((s, i) => s + i.totalAmount, 0)),
      totalPayment: roundAmount(items.reduce((s, i) => s + i.totalPayment, 0)),
      totalOpenAmount: roundAmount(items.reduce((s, i) => s + i.openAmount, 0)),
      totalBalance: roundAmount(items.reduce((s, i) => s + i.balance, 0)),
    };
  }
}

export const reportService = new ReportService();