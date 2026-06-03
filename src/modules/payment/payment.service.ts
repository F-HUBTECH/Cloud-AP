import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError, PeriodClosedError } from "@/lib/errors";
import { MODULE_CODES, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { canCreate, canUpdate, canDelete } from "@/lib/utils/permissions";
import { glPostingService } from "@/modules/gl-posting/gl-posting.service";
import { getGLTradeAccount } from "@/lib/utils/gl-helpers";
import { logAudit } from "@/lib/utils/audit";
import type {
  Payment,
  PaymentItem,
  PaymentFormData,
  PaymentWithVendor,
  OutstandingInvoice,
  PaymentListParams,
  PaymentListResult,
} from "./payment.types";

class PaymentService {
  private async getClient() {
    return createServerClient();
  }

  async list(params: PaymentListParams = {}): Promise<PaymentListResult> {
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      supplierCode,
      dateFrom,
      dateTo,
      status,
      search,
    } = params;

    const supabase = await this.getClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (supplierCode) query = query.eq("supplier_code", supplierCode);
    if (dateFrom) query = query.gte("doc_date", dateFrom);
    if (dateTo) query = query.lte("doc_date", dateTo);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `doc_number.ilike.%${search}%,cheque_number.ilike.%${search}%,remark.ilike.%${search}%`,
      );
    }

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message);

    return {
      data: (data ?? []) as Payment[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<PaymentWithVendor> {
    const supabase = await this.getClient();

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (paymentError || !payment) {
      throw new NotFoundError("Payment", id);
    }

    const [itemsResult, invoicesResult, vendorResult] = await Promise.all([
      supabase
        .from("payment_items")
        .select("*")
        .eq("payment_id", id)
        .order("line_no", { ascending: true }),
      supabase.from("payment_invoices").select("*").eq("payment_id", id),
      supabase
        .from("vendors")
        .select("code, name_en, name_th, tax_id")
        .eq("code", payment.supplier_code)
        .single(),
    ]);

    if (itemsResult.error) throw new AppError(itemsResult.error.message);

    return {
      ...(payment as Payment),
      vendor: vendorResult.data
        ? {
            code: vendorResult.data.code,
            name_en: vendorResult.data.name_en,
            name_th: vendorResult.data.name_th,
            tax_id: vendorResult.data.tax_id,
          }
        : {
            code: payment.supplier_code,
            name_en: "",
            name_th: null,
            tax_id: null,
          },
      items: (itemsResult.data ?? []) as PaymentItem[],
      invoices: (invoicesResult.data ?? []) as PaymentWithVendor["invoices"],
    };
  }

  async create(formData: PaymentFormData): Promise<Payment> {
    if (!(await canCreate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to create payment", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    if (formData.period_year && formData.period_month) {
      const { data: period } = await supabase
        .from("periods")
        .select("closed")
        .eq("period_year", formData.period_year)
        .eq("period_month", formData.period_month)
        .single();
      if (period?.closed) {
        throw new PeriodClosedError(`${formData.period_year}/${formData.period_month}`);
      }
    }

    const { data: docNumber, error: docNumberError } = await supabase.rpc(
      "next_doc_number",
      {
        p_table: "payments",
        p_field: "doc_number",
        p_prefix: "PV",
        p_digits: 5,
      },
    );

    if (docNumberError) throw new AppError(docNumberError.message);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? null;

    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of formData.items) {
      totalDebit += item.dr_amount;
      totalCredit += item.cr_amount;
    }

    const totalWht = formData.total_wht ?? 0;
    const totalVat = formData.total_vat ?? 0;
    const totalAmount = formData.total_amount ?? (totalDebit || totalCredit);
    const totalNet = formData.total_net ?? (totalAmount - totalWht - totalVat);

    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        doc_number: docNumber as string,
        doc_date: formData.doc_date,
        supplier_code: formData.supplier_code,
        supplier_id: formData.supplier_id ?? null,
        pay_method: formData.pay_method,
        pay_code: formData.pay_code ?? null,
        bank_code: formData.bank_code ?? null,
        bank_name: formData.bank_name ?? null,
        cheque_number: formData.cheque_number ?? null,
        cheque_date: formData.cheque_date ?? null,
        remark: formData.remark ?? null,
        currency: "THB",
        total_amount: totalAmount,
        total_wht: totalWht,
        total_vat: totalVat,
        total_net: totalNet,
        deposit_amount: formData.deposit_amount ?? 0,
        deposit_vat: formData.deposit_vat ?? 0,
        status: "draft",
        period_year: formData.period_year ?? null,
        period_month: formData.period_month ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) throw new AppError(insertError.message);

    const paymentId = (payment as Payment).id;

    if (formData.items.length > 0) {
      const itemRows = formData.items.map((item, index) => ({
        payment_id: paymentId,
        line_no: index + 1,
        gl_account: item.gl_account ?? null,
        description: item.description ?? null,
        dr_amount: item.dr_amount,
        cr_amount: item.cr_amount,
      }));

      const { error: itemsError } = await supabase
        .from("payment_items")
        .insert(itemRows);

      if (itemsError) throw new AppError(itemsError.message);
    }

    if (formData.invoices && formData.invoices.length > 0) {
      const invoiceRows = formData.invoices.map((inv) => ({
        payment_id: paymentId,
        invoice_id: inv.invoice_id,
        voucher_number: inv.voucher_number ?? null,
        amount_paid: inv.amount_paid ?? 0,
        wht_amount: inv.wht_amount ?? 0,
      }));

      const { error: invoicesError } = await supabase
        .from("payment_invoices")
        .insert(invoiceRows);

      if (invoicesError) throw new AppError(invoicesError.message);
    }

    return payment as Payment;
  }

  async approve(id: string): Promise<Payment> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to approve payment", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: fetchError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError("Payment", id);
    }

    if (existing.status !== "draft" && existing.status !== "pending_approval") {
      throw new AppError(`Cannot approve payment in '${existing.status}' status`, "INVALID_STATUS", 422);
    }

    const { data: updated, error: updateError } = await supabase
      .from("payments")
      .update({ status: "approved" })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    await logAudit({
      tableName: "payments",
      recordId: id,
      action: "approve",
      oldData: { status: existing.status },
      newData: { status: "approved" },
      detail: `Approved payment ${(updated as Payment).doc_number}`,
    });

    return updated as Payment;
  }

  async pay(
    id: string,
    payDate: string,
    chequeNumber?: string,
    remark?: string,
  ): Promise<Payment> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to update payment", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !payment) {
      throw new NotFoundError("Payment", id);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? null;

    const updateData: Record<string, unknown> = {
      status: "paid",
      paid_at: payDate,
      paid_by: userId,
    };

    if (chequeNumber) {
      updateData.cheque_number = chequeNumber;
    }

    const { data: updated, error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    const { data: paymentInvoices } = await supabase
      .from("payment_invoices")
      .select("invoice_id, amount_paid")
      .eq("payment_id", id);

    if (paymentInvoices) {
      for (const pi of paymentInvoices) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("balance, paid_amount, wht_code")
          .eq("id", pi.invoice_id)
          .single();

        const currentPaid = Number(inv?.paid_amount) || 0;
        const currentBalance = Number(inv?.balance) || 0;
        const newPaidAmount = currentPaid + Number(pi.amount_paid);
        const newBalance = currentBalance - Number(pi.amount_paid);

        await supabase
          .from("invoices")
          .update({
            status: newBalance <= 0.01 ? "paid" : "approved",
            paid_amount: newPaidAmount,
            balance: Math.max(newBalance, 0),
          })
          .eq("id", pi.invoice_id);

        if (inv?.wht_code) {
          try {
            const { whtService } = await import("./withholding-tax.service");
            await whtService.generateWht(id);
          } catch {
            // WHT generation failure should not block payment
          }
        }
      }
    }

    if (chequeNumber && (updated as Record<string, unknown>)?.pay_method === "cheque") {
      await supabase.from("cheque_transactions").insert({
        payment_id: id,
        bank_code: (updated as Record<string, unknown>)?.bank_code ?? null,
        bank_name: (updated as Record<string, unknown>)?.bank_name ?? null,
        cheque_date: payDate,
        cheque_number: chequeNumber,
        remark: remark ?? null,
        created_by: userId,
      });
    }

    await supabase.rpc("recalculate_vendor_balance", {
      p_vendor_code: (updated as Record<string, unknown>)?.supplier_code as string,
    });

    try {
      const tradeGl = await getGLTradeAccount(await this.getClient());

      const paymentItems = await (await this.getClient())
        .from("payment_items")
        .select("gl_account, dr_amount, cr_amount")
        .eq("payment_id", id);

      const jvLines: { glAccount: string; description?: string; debit: number; credit: number }[] = [];

      for (const pi of paymentItems?.data ?? []) {
        if (Number(pi.dr_amount) > 0) {
          jvLines.push({ glAccount: pi.gl_account ?? "1100", debit: Number(pi.dr_amount), credit: 0 });
        }
        if (Number(pi.cr_amount) > 0) {
          jvLines.push({ glAccount: pi.gl_account ?? "1100", debit: 0, credit: Number(pi.cr_amount) });
        }
      }

      jvLines.push({
        glAccount: tradeGl,
        description: `AP Payment ${(updated as Record<string, unknown>)?.doc_number as string}`,
        debit: Number((updated as Record<string, unknown>)?.total_net) || 0,
        credit: 0,
      });

      await glPostingService.createJournalEntry({
        sourceType: "payment",
        sourceId: id,
        docNumber: (updated as Record<string, unknown>)?.doc_number as string,
        docDate: payDate,
        periodYear: String((updated as Record<string, unknown>)?.period_year ?? ""),
        periodMonth: String((updated as Record<string, unknown>)?.period_month ?? ""),
        description: `AP Payment ${(updated as Record<string, unknown>)?.doc_number as string}`,
        lines: jvLines,
        createdBy: userId,
      });
    } catch {
      // GL posting failure should not block payment
    }

    await logAudit({
      tableName: "payments",
      recordId: id,
      action: "pay",
      newData: { status: "paid", docNumber: (updated as Record<string, unknown>)?.doc_number },
      detail: `Payment ${chequeNumber ? `cheque ${chequeNumber}` : "completed"}`,
    });

    return updated as Payment;
  }

  async cancelPayment(id: string, reason: string): Promise<Payment> {
    if (!(await canDelete(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to cancel payment", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status, supplier_code")
      .eq("id", id)
      .single();

    if (fetchError || !payment) {
      throw new NotFoundError("Payment", id);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? null;

    const { data: paymentInvoices } = await supabase
      .from("payment_invoices")
      .select("invoice_id, amount_paid")
      .eq("payment_id", id);

    const { data: updated, error: updateError } = await supabase
      .from("payments")
      .update({
        status: "cancelled",
        cancel_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    if (paymentInvoices) {
      for (const pi of paymentInvoices) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("balance, paid_amount")
          .eq("id", pi.invoice_id)
          .single();

        if (inv) {
          const currentPaid = Number(inv.paid_amount) || 0;
          const currentBalance = Number(inv.balance) || 0;
          const newPaidAmount = Math.max(currentPaid - Number(pi.amount_paid), 0);
          const newBalance = currentBalance + Number(pi.amount_paid);

          await supabase
            .from("invoices")
            .update({
              status: "approved",
              paid_amount: newPaidAmount,
              balance: newBalance,
            })
            .eq("id", pi.invoice_id);
        }
      }
    }

    await supabase.rpc("recalculate_vendor_balance", {
      p_vendor_code: payment.supplier_code as string,
    });

    try {
      await glPostingService.cancelJournalEntries("payment", id);
    } catch {
      // GL cancellation failure should not block payment cancel
    }

    await logAudit({
      tableName: "payments",
      recordId: id,
      action: "cancel",
      oldData: { status: payment.status },
      newData: { status: "cancelled" },
      detail: reason,
    });

    return updated as Payment;
  }

  async cancelAssign(id: string, reason: string): Promise<Payment> {
    const supabase = await this.getClient();

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status, supplier_code, doc_number")
      .eq("id", id)
      .single();

    if (fetchError || !payment) {
      throw new NotFoundError("Payment assignment", id);
    }

    if (payment.status === "paid") {
      throw new AppError("Cannot cancel a paid assignment", "PAYMENT_ALREADY_PAID", 422);
    }

    const { data: { user: _authUser } } = await supabase.auth.getUser();

    const { data: paymentInvoices } = await supabase
      .from("payment_invoices")
      .select("invoice_id, amount_paid")
      .eq("payment_id", id);

    if (paymentInvoices && paymentInvoices.length > 0) {
      for (const pi of paymentInvoices) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("balance, paid_amount")
          .eq("id", pi.invoice_id)
          .single();

        if (inv) {
          const currentPaid = Number(inv.paid_amount) || 0;
          const currentBalance = Number(inv.balance) || 0;
          const newPaidAmount = Math.max(currentPaid - Number(pi.amount_paid), 0);
          const newBalance = currentBalance + Number(pi.amount_paid);

          await supabase
            .from("invoices")
            .update({
              status: "approved",
              paid_amount: newPaidAmount,
              balance: newBalance,
            })
            .eq("id", pi.invoice_id);
        }
      }

      await supabase.from("payment_invoices").delete().eq("payment_id", id);
    }

    await supabase.from("payment_items").delete().eq("payment_id", id);

    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (deleteError) throw new AppError(deleteError.message);

    if (payment.supplier_code) {
      await supabase.rpc("recalculate_vendor_balance", {
        p_vendor_code: payment.supplier_code,
      });
    }

    try {
      await glPostingService.cancelJournalEntries("payment", id);
    } catch {
      // GL cancellation failure should not block
    }

    await logAudit({
      tableName: "payments",
      recordId: id,
      action: "cancel",
      oldData: { status: payment.status, docNumber: payment.doc_number },
      newData: { status: "cancelled" },
      detail: `Cancelled assignment ${payment.doc_number}: ${reason}`,
    });

    return payment as Payment;
  }

  async searchOutstanding(supplierCode?: string): Promise<OutstandingInvoice[]> {
    const supabase = await this.getClient();

    let query = supabase
      .from("invoices")
      .select(
        "id, doc_number, doc_date, supplier_code, inv_number, amount, paid_amount, due_date, credit_term, status, vendor:vendors(code, name_en)",
      )
      .in("status", ["approved", "pending_approval"]);

    if (supplierCode) {
      query = query.eq("supplier_code", supplierCode);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    return (data ?? []).map((row: Record<string, unknown>) => {
      const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor as Record<string, unknown> | null;
      return {
        id: row.id as string,
        doc_number: row.doc_number as string,
        doc_date: row.doc_date as string,
        supplier_code: row.supplier_code as string,
        inv_number: row.inv_number as string,
        amount: row.amount as number,
        paid_amount: (row.paid_amount as number) ?? 0,
        balance_amount: (row.amount as number) - ((row.paid_amount as number) ?? 0),
        due_date: row.due_date as string | null,
        credit_term: row.credit_term as number | null,
        status: row.status as string,
        supplier_name: (vendor?.name_en as string) ?? "",
      };
    });
  }
}

export const paymentService = new PaymentService();