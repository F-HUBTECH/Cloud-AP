import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE, MODULE_CODES } from "@/lib/constants";
import { canCreate, canRead } from "@/lib/utils/permissions";
import { logAudit } from "@/lib/utils/audit";
import type {
  DepositApplication,
  DepositApplicationWithDetails,
  AvailableDeposit,
  AvailableInvoice,
  DepositApplicationFormData,
  DepositApplicationListParams,
  DepositApplicationListResult,
} from "./deposit-application.types";

class DepositApplicationService {
  private async getClient() {
    return createServerClient();
  }

  async list(params: DepositApplicationListParams = {}): Promise<DepositApplicationListResult> {
    if (!(await canRead(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to view deposit applications", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      supplierCode,
      status,
      dateFrom,
      dateTo,
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("deposit_applications")
      .select("*, deposit:deposit_payments(doc_number, deposit_date, amount, supplier_code), invoice:invoices(doc_number, doc_date, balance)", { count: "exact" })
      .order("applied_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("applied_at", dateFrom);
    if (dateTo) query = query.lte("applied_at", dateTo);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message);

    const results: DepositApplicationWithDetails[] = [];

    const supplierCodes = [...new Set((data ?? []).map((r: Record<string, unknown>) => (r.deposit as Record<string, unknown>)?.supplier_code as string).filter(Boolean))];
    const vendorMap = new Map<string, string>();
    if (supplierCodes.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("code, name_en")
        .in("code", supplierCodes);
      for (const v of vendors ?? []) {
        vendorMap.set(v.code, v.name_en ?? "");
      }
    }

    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const deposit = row.deposit as Record<string, unknown> | null;
      const invoice = row.invoice as Record<string, unknown> | null;
      const supplierCode = (deposit?.supplier_code as string) ?? "";

      results.push({
        id: row.id as string,
        depositId: row.deposit_id as string,
        invoiceId: row.invoice_id as string,
        amountApplied: Number(row.amount_applied) || 0,
        vatApplied: Number(row.vat_applied) || 0,
        appliedBy: row.applied_by as string | null,
        appliedAt: row.applied_at as string,
        status: row.status as string,
        cancelledAt: row.cancelled_at as string | null,
        cancelledBy: row.cancelled_by as string | null,
        cancelReason: row.cancel_reason as string | null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        depositDocNumber: (deposit?.doc_number as string) ?? "",
        depositDate: (deposit?.deposit_date as string) ?? "",
        depositAmount: Number(deposit?.amount) || 0,
        invoiceDocNumber: (invoice?.doc_number as string) ?? "",
        invoiceDate: (invoice?.doc_date as string) ?? "",
        invoiceBalance: Number(invoice?.balance) || 0,
        vendorCode: supplierCode,
        vendorName: vendorMap.get(supplierCode) ?? "",
      });
    }

    return {
      data: results,
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getAvailableDeposits(supplierCode?: string): Promise<AvailableDeposit[]> {
    const supabase = await this.getClient();

    let query = supabase
      .from("deposit_payments")
      .select("id, doc_number, deposit_date, amount, vat_amount, applied_amount, remaining_amount, supplier_code, supplier_id, status")
      .neq("status", "cancelled")
      .order("deposit_date", { ascending: false });

    if (supplierCode) {
      query = query.eq("supplier_code", supplierCode);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    return (data ?? []).map((row: Record<string, unknown>) => {
      const amount = Number(row.amount) || 0;
      const appliedAmount = Number(row.applied_amount) || 0;
      const remaining = Number(row.remaining_amount) || (amount - appliedAmount);

      return {
        id: row.id as string,
        docNumber: row.doc_number as string,
        depositDate: row.deposit_date as string,
        amount,
        vatAmount: Number(row.vat_amount) || 0,
        appliedAmount,
        remainingAmount: remaining,
        supplierCode: row.supplier_code as string,
        supplierId: row.supplier_id as string,
        status: row.status as string,
      };
    }).filter((d: AvailableDeposit) => d.remainingAmount > 0);
  }

  async getAvailableInvoices(supplierCode: string): Promise<AvailableInvoice[]> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("invoices")
      .select("id, doc_number, doc_date, inv_number, total_amount, balance, supplier_code, ap_type_code")
      .eq("supplier_code", supplierCode)
      .in("status", ["approved", "posted"])
      .gt("balance", 0)
      .order("doc_date", { ascending: true });

    if (error) throw new AppError(error.message);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      docNumber: row.doc_number as string,
      docDate: row.doc_date as string,
      invNumber: row.inv_number as string | null,
      totalAmount: Number(row.total_amount) || 0,
      balance: Number(row.balance) || 0,
      supplierCode: row.supplier_code as string,
      apTypeCode: row.ap_type_code as string | null,
    }));
  }

  async applyDeposit(formData: DepositApplicationFormData): Promise<DepositApplication> {
    if (!(await canCreate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to apply deposits", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: deposit, error: depositError } = await supabase
      .from("deposit_payments")
      .select("id, doc_number, amount, vat_amount, applied_amount, remaining_amount, supplier_code, status")
      .eq("id", formData.depositId)
      .single();

    if (depositError || !deposit) {
      throw new NotFoundError("DepositPayment", formData.depositId);
    }

    if (deposit.status === "cancelled") {
      throw new AppError("Cannot apply a cancelled deposit", "DEPOSIT_CANCELLED", 422);
    }

    if (deposit.status === "applied") {
      throw new AppError("Deposit is already fully applied", "DEPOSIT_FULLY_APPLIED", 422);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    let totalApplied = 0;
    let totalVatApplied = 0;

    for (const app of formData.applications) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, balance, supplier_code, status")
        .eq("id", app.invoiceId)
        .single();

      if (!invoice) {
        throw new NotFoundError("Invoice", app.invoiceId);
      }

      if (invoice.supplier_code !== deposit.supplier_code) {
        throw new AppError(`Invoice ${invoice.id} belongs to a different vendor than the deposit`, "VENDOR_MISMATCH", 422);
      }

      if (!["approved", "posted"].includes(invoice.status)) {
        throw new AppError(`Invoice ${invoice.id} is not in an approved state`, "INVOICE_NOT_APPROVED", 422);
      }

      if (app.amountApplied <= 0) {
        throw new AppError("Applied amount must be greater than zero", "INVALID_AMOUNT", 422);
      }

      totalApplied += app.amountApplied;
      totalVatApplied += app.vatApplied ?? 0;
    }

    const depositAmount = Number(deposit.amount) || 0;
    const existingApplied = Number(deposit.applied_amount) || 0;
    const remaining = Number(deposit.remaining_amount) || (depositAmount - existingApplied);

    if (totalApplied > remaining + 0.01) {
      throw new AppError(`Total applied amount (${totalApplied}) exceeds remaining deposit balance (${remaining.toFixed(2)})`, "AMOUNT_EXCEEDS_REMAINING", 422);
    }

    const applicationRows = formData.applications.map((app) => ({
      deposit_id: formData.depositId,
      invoice_id: app.invoiceId,
      amount_applied: app.amountApplied,
      vat_applied: app.vatApplied ?? 0,
      applied_by: authUser?.id ?? null,
      status: "active",
    }));

    const { data: applications, error: insertError } = await supabase
      .from("deposit_applications")
      .insert(applicationRows)
      .select();

    if (insertError) throw new AppError(insertError.message);

    const newAppliedTotal = existingApplied + totalApplied;
    const newRemaining = depositAmount - newAppliedTotal;
    const newStatus = newRemaining <= 0.01 ? "applied" : "active";

    for (const app of formData.applications) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("balance")
        .eq("id", app.invoiceId)
        .single();

      if (invoice) {
        const newBalance = Number(invoice.balance) - app.amountApplied;
        await supabase
          .from("invoices")
          .update({ balance: Math.max(newBalance, 0) })
          .eq("id", app.invoiceId);
      }
    }

    await supabase
      .from("deposit_payments")
      .update({
        applied_amount: newAppliedTotal,
        remaining_amount: newRemaining,
        status: newStatus,
      })
      .eq("id", formData.depositId);

    await supabase.rpc("recalculate_vendor_balance", { p_vendor_code: deposit.supplier_code });

    await logAudit({
      tableName: "deposit_applications",
      recordId: formData.depositId,
      action: "create",
      newData: { depositId: formData.depositId, totalApplied, invoiceCount: formData.applications.length },
      detail: `Applied deposit ${(deposit as Record<string, unknown>).doc_number} to ${formData.applications.length} invoice(s), total ${totalApplied}`,
    });

    const firstApp = (applications as Record<string, unknown>[])?.[0];
    return {
      id: firstApp?.id as string ?? "",
      depositId: formData.depositId,
      invoiceId: formData.applications[0].invoiceId,
      amountApplied: totalApplied,
      vatApplied: totalVatApplied,
      appliedBy: authUser?.id ?? null,
      appliedAt: new Date().toISOString(),
      status: "active",
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async cancelApplication(id: string, reason: string): Promise<void> {
    const supabase = await this.getClient();

    const { data: app, error: appError } = await supabase
      .from("deposit_applications")
      .select("id, deposit_id, invoice_id, amount_applied, vat_applied, status")
      .eq("id", id)
      .single();

    if (appError || !app) {
      throw new NotFoundError("DepositApplication", id);
    }

    if ((app as Record<string, unknown>).status === "cancelled") {
      throw new AppError("Application is already cancelled", "ALREADY_CANCELLED", 422);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const amountApplied = Number((app as Record<string, unknown>).amount_applied) || 0;
    const depositId = (app as Record<string, unknown>).deposit_id as string;
    const cancelledInvoiceId = (app as Record<string, unknown>).invoice_id as string;

    const { data: deposit } = await supabase
      .from("deposit_payments")
      .select("id, applied_amount, remaining_amount, amount, supplier_code, status")
      .eq("id", depositId)
      .single();

    const { error: cancelError } = await supabase
      .from("deposit_applications")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: authUser?.id ?? null,
        cancel_reason: reason,
      })
      .eq("id", id);

    if (cancelError) throw new AppError(cancelError.message);

    const { data: invoice } = await supabase
      .from("invoices")
      .select("balance")
      .eq("id", cancelledInvoiceId)
      .single();

    if (invoice) {
      await supabase
        .from("invoices")
        .update({ balance: Number(invoice.balance) + amountApplied })
        .eq("id", cancelledInvoiceId);
    }

    if (deposit) {
      const currentApplied = Number(deposit.applied_amount) || 0;
      const newApplied = Math.max(currentApplied - amountApplied, 0);
      const depositAmount = Number(deposit.amount) || 0;
      const newRemaining = depositAmount - newApplied;

      await supabase
        .from("deposit_payments")
        .update({
          applied_amount: newApplied,
          remaining_amount: Math.max(newRemaining, 0),
          status: newApplied <= 0.01 ? "active" : "active",
        })
        .eq("id", depositId);

      await supabase.rpc("recalculate_vendor_balance", { p_vendor_code: deposit.supplier_code as string });
    }

    await logAudit({
      tableName: "deposit_applications",
      recordId: id,
      action: "cancel",
      oldData: { status: "active" },
      newData: { status: "cancelled" },
      detail: `Cancelled deposit application for deposit ${depositId}, restored ${amountApplied} to invoice ${cancelledInvoiceId}: ${reason}`,
    });
  }
}

export const depositApplicationService = new DepositApplicationService();