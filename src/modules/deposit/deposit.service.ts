import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError, PeriodClosedError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE, MODULE_CODES } from "@/lib/constants";
import { canCreate, canUpdate, canDelete } from "@/lib/utils/permissions";
import { glPostingService } from "@/modules/gl-posting/gl-posting.service";
import { getGLTradeAccount } from "@/lib/utils/gl-helpers";
import { recalcVendorBalance } from "@/lib/utils/vendor-helpers";
import { logAudit } from "@/lib/utils/audit";
import type { DepositPayment, DepositPaymentItem, DepositFormData, DepositWithVendor, DepositListParams, DepositListResult } from "./deposit.types";

class DepositService {
  private async getClient() {
    return createServerClient();
  }

  async list(params: DepositListParams = {}): Promise<DepositListResult> {
    const supabase = await this.getClient();
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      supplierCode,
      status,
      dateFrom,
      dateTo,
      search,
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("deposit_payments")
      .select("*", { count: "exact" })
      .order("id", { ascending: false })
      .range(from, to);

    if (supplierCode) query = query.eq("supplier_code", supplierCode);
    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("deposit_date", dateFrom);
    if (dateTo) query = query.lte("deposit_date", dateTo);
    if (search) {
      query = query.or(`doc_number.ilike.%${search}%,remark.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message);

    return {
      data: (data ?? []).map(this.mapDeposit),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<DepositWithVendor> {
    const supabase = await this.getClient();

    const { data: header, error: headerError } = await supabase
      .from("deposit_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (headerError || !header) {
      throw new NotFoundError("DepositPayment", String(id));
    }

    const { data: items, error: itemsError } = await supabase
      .from("deposit_payment_items")
      .select("*")
      .eq("deposit_id", id)
      .order("line_no", { ascending: true });

    if (itemsError) throw new AppError(itemsError.message);

    const { data: vendor } = await supabase
      .from("vendors")
      .select("code, name_en, name_th, tax_id")
      .eq("code", header.supplier_code)
      .single();

    return {
      ...this.mapDeposit(header),
      vendor: vendor
        ? { code: vendor.code, name_en: vendor.name_en, name_th: vendor.name_th, tax_id: vendor.tax_id }
        : { code: header.supplier_code, name_en: "", name_th: null, tax_id: null },
      items: (items ?? []).map(this.mapDepositItem),
    };
  }

  async create(formData: DepositFormData): Promise<DepositPayment> {
    if (!(await canCreate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to create deposit", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    if (formData.depositDate) {
      const periodMonth = formData.depositDate.slice(5, 7);
      const periodYear = formData.depositDate.slice(0, 4);
      const { data: period } = await supabase
        .from("periods")
        .select("closed")
        .eq("period_month", periodMonth)
        .eq("period_year", periodYear)
        .single();
      if (period?.closed) {
        throw new PeriodClosedError(`${periodYear}/${periodMonth}`);
      }
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const depositNumber = await this.generateDepositNumber();

    const { data: header, error: headerError } = await supabase
      .from("deposit_payments")
      .insert({
        doc_number: depositNumber,
        deposit_date: formData.depositDate,
        supplier_code: formData.supplierCode,
        supplier_id: formData.supplierId || null,
        due_date: formData.dueDate || null,
        amount: formData.amount,
        vat_amount: formData.vatAmount || 0,
        vat_percent: formData.vatPercent || 0,
        po_number: formData.poNumber || null,
        remark: formData.remark || null,
        pay_code: formData.payCode || null,
        paid_by: formData.paidBy || null,
        cheque_number: formData.chequeNumber || null,
        cheque_date: formData.chequeDate || null,
        status: "active",
        created_by: authUser?.id ?? null,
      })
      .select()
      .single();

    if (headerError) throw new AppError(headerError.message);

    const depositId = header.id;

    const detailRows = formData.items.map((item, index) => ({
      deposit_id: depositId,
      line_no: index + 1,
      gl_account: item.glAccount,
      description: item.description || null,
      dr_amount: item.drAmount,
      cr_amount: item.crAmount,
    }));

    const { error: detailError } = await supabase
      .from("deposit_payment_items")
      .insert(detailRows);

    if (detailError) throw new AppError(detailError.message);

    await this.recalcVendorBalance(formData.supplierCode);

    try {
      const tradeGl = await getGLTradeAccount(await this.getClient());

      const periodMonth = formData.depositDate?.slice(5, 7) ?? "";
      const periodYear = formData.depositDate?.slice(0, 4) ?? "";

      await glPostingService.createJournalEntry({
        sourceType: "deposit",
        sourceId: depositId,
        docNumber: depositNumber,
        docDate: formData.depositDate,
        periodYear,
        periodMonth,
        description: `Deposit ${depositNumber} - ${formData.supplierCode}`,
        lines: [
          ...formData.items.filter((item) => item.drAmount > 0).map((item) => ({
            glAccount: item.glAccount,
            description: item.description || undefined,
            debit: item.drAmount,
            credit: 0,
          })),
          ...formData.items.filter((item) => item.crAmount > 0).map((item) => ({
            glAccount: item.glAccount,
            description: item.description || undefined,
            debit: 0,
            credit: item.crAmount,
          })),
          {
            glAccount: tradeGl,
            description: `AP Deposit - ${depositNumber}`,
            debit: 0,
            credit: formData.amount,
          },
        ],
        createdBy: authUser?.id ?? null,
      });
    } catch {
      // GL posting failure should not block deposit creation
    }

    await logAudit({
      tableName: "deposit_payments",
      recordId: depositId,
      action: "create",
      newData: { docNumber: depositNumber, supplierCode: formData.supplierCode, amount: formData.amount },
      detail: `Created deposit ${depositNumber}`,
    });

    return this.mapDeposit(header);
  }

  async update(id: string, formData: Partial<DepositFormData>): Promise<DepositPayment> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to update deposit", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("deposit_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("DepositPayment", String(id));
    }

    if (existing.status === "applied") {
      throw new AppError("Cannot update an applied deposit", "DEPOSIT_ALREADY_APPLIED", 422);
    }

    if (existing.status === "cancelled") {
      throw new AppError("Cannot update a cancelled deposit", "DEPOSIT_CANCELLED", 422);
    }

    const updateFields: Record<string, unknown> = {};
    if (formData.depositDate !== undefined) updateFields.deposit_date = formData.depositDate;
    if (formData.dueDate !== undefined) updateFields.due_date = formData.dueDate;
    if (formData.amount !== undefined) updateFields.amount = formData.amount;
    if (formData.vatAmount !== undefined) updateFields.vat_amount = formData.vatAmount;
    if (formData.vatPercent !== undefined) updateFields.vat_percent = formData.vatPercent;
    if (formData.supplierCode !== undefined) updateFields.supplier_code = formData.supplierCode;
    if (formData.supplierId !== undefined) updateFields.supplier_id = formData.supplierId;
    if (formData.remark !== undefined) updateFields.remark = formData.remark;
    if (formData.chequeNumber !== undefined) updateFields.cheque_number = formData.chequeNumber;
    if (formData.chequeDate !== undefined) updateFields.cheque_date = formData.chequeDate;
    if (formData.paidBy !== undefined) updateFields.paid_by = formData.paidBy;
    if (formData.payCode !== undefined) updateFields.pay_code = formData.payCode;
    if (formData.poNumber !== undefined) updateFields.po_number = formData.poNumber;

    if (formData.items && formData.items.length > 0) {
      const { error: deleteItemsError } = await supabase
        .from("deposit_payment_items")
        .delete()
        .eq("deposit_id", id);

      if (deleteItemsError) throw new AppError(deleteItemsError.message);

      const detailRows = formData.items.map((item, index) => ({
        deposit_id: id,
        line_no: index + 1,
        gl_account: item.glAccount,
        description: item.description || null,
        dr_amount: item.drAmount,
        cr_amount: item.crAmount,
      }));

      const { error: detailError } = await supabase
        .from("deposit_payment_items")
        .insert(detailRows);

      if (detailError) throw new AppError(detailError.message);
    }

    const { data: updated, error: updateError } = await supabase
      .from("deposit_payments")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    return this.mapDeposit(updated);
  }

  async delete(id: string): Promise<void> {
    if (!(await canDelete(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to delete deposit", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("deposit_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("DepositPayment", String(id));
    }

    if (existing.status === "applied") {
      throw new AppError("Cannot delete an applied deposit", "DEPOSIT_ALREADY_APPLIED", 422);
    }

    if (existing.status === "cancelled") {
      throw new AppError("Cannot delete a cancelled deposit", "DEPOSIT_CANCELLED", 422);
    }

    const { error: detailError } = await supabase
      .from("deposit_payment_items")
      .delete()
      .eq("deposit_id", id);

    if (detailError) throw new AppError(detailError.message);

    const { error: headerError } = await supabase
      .from("deposit_payments")
      .delete()
      .eq("id", id);

    if (headerError) throw new AppError(headerError.message);

    await this.recalcVendorBalance(existing.supplier_code as string);

    await logAudit({
      tableName: "deposit_payments",
      recordId: id,
      action: "delete",
      oldData: { docNumber: existing.doc_number, amount: existing.amount },
      detail: `Hard deleted deposit ${existing.doc_number}`,
    });
  }

  async cancel(id: string, reason: string): Promise<DepositPayment> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to cancel deposit", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("deposit_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("DepositPayment", String(id));
    }

    if (existing.status === "cancelled") {
      throw new AppError("Deposit is already cancelled", "DEPOSIT_CANCELLED", 422);
    }

    if (existing.status === "applied") {
      throw new AppError("Cannot cancel an applied deposit", "DEPOSIT_ALREADY_APPLIED", 422);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { data: updated, error: updateError } = await supabase
      .from("deposit_payments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: authUser?.id ?? null,
        cancel_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    await this.recalcVendorBalance(existing.supplier_code as string);

    try {
      await glPostingService.cancelJournalEntries("deposit", id);
    } catch {
      // GL cancellation failure should not block deposit cancel
    }

    await logAudit({
      tableName: "deposit_payments",
      recordId: id,
      action: "cancel",
      oldData: { status: existing.status },
      newData: { status: "cancelled" },
      detail: `Cancelled deposit ${existing.doc_number}: ${reason}`,
    });

    return this.mapDeposit(updated);
  }

  private async generateDepositNumber(): Promise<string> {
    const supabase = await this.getClient();

    const { data: config } = await supabase
      .from("config")
      .select("dp_auto, dp_format1, dp_format2, dp_fix_for, dp_for_len")
      .single();

    if (!config) throw new AppError("Configuration not found");

    const prefix = config.dp_auto
      ? `${config.dp_format1 || "DP"}${config.dp_format2 === "yymm" ? new Date().getFullYear().toString().slice(-2) + (new Date().getMonth() + 1).toString().padStart(2, "0") : config.dp_format2 === "yy" ? new Date().getFullYear().toString().slice(-2) : ""}`
      : config.dp_format1 || "DP";

    const { data, error } = await supabase.rpc("next_doc_number", {
      p_table: "deposit_payments",
      p_field: "doc_number",
      p_prefix: prefix,
      p_digits: config.dp_for_len ?? 5,
    });

    if (error) throw new AppError(error.message);
    return data as string;
  }

  private async recalcVendorBalance(supplierCode: string): Promise<void> {
    return recalcVendorBalance(await this.getClient(), supplierCode);
  }

  private mapDeposit(row: Record<string, unknown>): DepositPayment {
    return {
      id: row.id as string,
      docNumber: row.doc_number as string,
      depositDate: row.deposit_date as string,
      supplierCode: row.supplier_code as string,
      supplierId: row.supplier_id as string | null,
      dueDate: row.due_date as string | null,
      amount: row.amount as number,
      vatAmount: row.vat_amount as number,
      vatPercent: row.vat_percent as number,
      poNumber: row.po_number as string | null,
      remark: row.remark as string | null,
      payCode: row.pay_code as string | null,
      paidBy: row.paid_by as string | null,
      chequeNumber: row.cheque_number as string | null,
      chequeDate: row.cheque_date as string | null,
      status: row.status as string,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapDepositItem(row: Record<string, unknown>): DepositPaymentItem {
    return {
      id: row.id as string,
      depositId: row.deposit_id as string,
      lineNo: row.line_no as number,
      glAccount: row.gl_account as string,
      description: row.description as string | null,
      drAmount: row.dr_amount as number,
      crAmount: row.cr_amount as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const depositService = new DepositService();