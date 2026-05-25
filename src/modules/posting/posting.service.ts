import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, PeriodClosedError, DuplicateError, AppError } from "@/lib/errors";
import { VOUCHER_STATUS, MODULE_CODES, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { VoucherStatus, VatMode, TransactionType } from "@/lib/constants";
import { canCreate, canUpdate, canDelete } from "@/lib/utils/permissions";
import { calculateVatExclusive, calculateVatInclusive, calculateNoVat } from "@/lib/utils/calculate-vat";
import { calculateWhtAmount } from "@/lib/utils/calculate-wht";
import { glPostingService } from "@/modules/gl-posting/gl-posting.service";
import { logAudit } from "@/lib/utils/audit";
import type { Invoice, InvoiceItem, InvoiceFormData, InvoiceWithVendor, InvoiceOutstanding, InvoiceListParams, InvoiceListResult, VendorBalanceSummary } from "./posting.types";
class PostingService {
  private async getClient() {
    return createServerClient();
  }

  async list(params: InvoiceListParams = {}): Promise<InvoiceListResult> {
    const supabase = await this.getClient();
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      supplierCode,
      periodMonth,
      periodYear,
      status,
      transactionType,
      dateFrom,
      dateTo,
      search,
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (supplierCode) query = query.eq("supplier_code", supplierCode);
    if (periodMonth) query = query.eq("period_month", periodMonth);
    if (periodYear) query = query.eq("period_year", periodYear);
    if (status) query = query.eq("status", status);
    if (transactionType) query = query.eq("ap_type_code", transactionType);
    if (dateFrom) query = query.gte("doc_date", dateFrom);
    if (dateTo) query = query.lte("doc_date", dateTo);
    if (search) {
      query = query.or(`doc_number.ilike.%${search}%,inv_number.ilike.%${search}%,remark.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message);

    return {
      data: (data ?? []).map(this.mapInvoice),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<InvoiceWithVendor> {
    const supabase = await this.getClient();

    const { data: header, error: headerError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (headerError || !header) {
      throw new NotFoundError("Invoice", id);
    }

    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("line_no", { ascending: true });

    if (itemsError) throw new AppError(itemsError.message);

    const { data: vendor } = await supabase
      .from("vendors")
      .select("code, name_en, name_th, tax_id")
      .eq("code", header.supplier_code)
      .single();

    const invoice: InvoiceWithVendor = {
      ...this.mapInvoice(header),
      supplier: vendor
        ? {
            code: vendor.code,
            name: vendor.name_en,
            name_th: vendor.name_th,
            tax_id: vendor.tax_id,
          }
        : { code: header.supplier_code, name: "", name_th: null, tax_id: null },
      items: (items ?? []).map(this.mapInvoiceItem),
    };

    return invoice;
  }

  async create(formData: InvoiceFormData): Promise<Invoice> {
    if (!(await canCreate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to create voucher", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    await this.validatePeriodOpen(formData.periodMonth, formData.periodYear);

    const docNumber = formData.documentNumber ?? await this.generateDocNumber(supabase);

    await this.validateDuplicateDocNo(docNumber);
    if (formData.invoiceNumber) {
      await this.validateDuplicateInvNo(formData.invoiceNumber);
    }

    const supplierId = formData.supplierId ?? await this.resolveSupplierId(supabase, formData.supplierCode);

    const totals = this.calculateTotals(formData);

    const { data: header, error: headerError } = await supabase
      .from("invoices")
      .insert({
        doc_number: docNumber,
        doc_date: formData.documentDate,
        supplier_code: formData.supplierCode,
        supplier_id: supplierId,
        inv_number: formData.invoiceNumber,
        inv_date: formData.invoiceDate || null,
        total_amount: formData.amount,
        due_days: formData.creditTerm,
        due_date: formData.dueDate,
        remark: formData.remark || null,
        dr_amount: formData.debit,
        cr_amount: formData.credit,
        total_wht: formData.whtAmount || 0,
        vat_type: formData.vatType,
        status: VOUCHER_STATUS.DRAFT,
        receive_voucher: formData.receiveNumber || null,
        vat_number: formData.vatNumber || null,
        po_number: formData.poNumber || null,
        ap_type_code: formData.transactionType,
        wht_code: formData.whtCode || null,
        total_no_vat: totals.totalNoVat,
        total_vat: totals.totalVat,
        balance: totals.totalApTrade,
        period_month: formData.periodMonth,
        period_year: formData.periodYear,
        paid_amount: 0,
      })
      .select()
      .single();

    if (headerError) throw new AppError(headerError.message);

    const headerId = header.id;

    const detailRows = formData.items.map((item, index) => ({
      invoice_id: headerId,
      line_no: index + 1,
      gl_account: item.glAccount,
      description: item.description || null,
      dr_amount: item.debit,
      cr_amount: item.credit,
    }));

    const { error: detailError } = await supabase
      .from("invoice_items")
      .insert(detailRows);

    if (detailError) throw new AppError(detailError.message);

    await this.recalcVendorBalance(formData.supplierCode);

    try {
      const { data: tradeAccount } = await (await this.getClient())
        .from("config")
        .select("acc_trade")
        .single();
      const tradeGl = (tradeAccount as Record<string, unknown>)?.acc_trade as string ?? "2000";

      await glPostingService.createJournalEntry({
        sourceType: "invoice",
        sourceId: headerId,
        docNumber,
        docDate: formData.documentDate,
        periodYear: formData.periodYear,
        periodMonth: formData.periodMonth,
        description: `AP Voucher ${docNumber} - ${formData.supplierCode}`,
        lines: [
          ...formData.items.filter((item) => item.debit > 0).map((item) => ({
            glAccount: item.glAccount,
            description: item.description || undefined,
            debit: item.debit,
            credit: 0,
          })),
          ...formData.items.filter((item) => item.credit > 0).map((item) => ({
            glAccount: item.glAccount,
            description: item.description || undefined,
            debit: 0,
            credit: item.credit,
          })),
          {
            glAccount: tradeGl,
            description: `AP Trade - ${docNumber}`,
            debit: 0,
            credit: totals.totalApTrade,
          },
        ],
        createdBy: null,
      });
    } catch {
      // GL posting failure should not block invoice creation
    }

    await logAudit({
      tableName: "invoices",
      recordId: headerId,
      action: "create",
      newData: { docNumber, supplierCode: formData.supplierCode, amount: formData.amount },
      detail: `Created AP voucher ${docNumber}`,
    });

    return this.mapInvoice(header);
  }

  async update(id: string, formData: Partial<InvoiceFormData>): Promise<Invoice> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to update voucher", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("Invoice", id);
    }

    await this.validatePeriodOpen(
      formData.periodMonth ?? existing.period_month,
      formData.periodYear ?? existing.period_year
    );

    const updateFields: Record<string, unknown> = {};
    if (formData.documentNumber !== undefined) updateFields.doc_number = formData.documentNumber;
    if (formData.documentDate !== undefined) updateFields.doc_date = formData.documentDate;
    if (formData.supplierCode !== undefined) updateFields.supplier_code = formData.supplierCode;
    if (formData.supplierId !== undefined) updateFields.supplier_id = formData.supplierId;
    if (formData.invoiceNumber !== undefined) updateFields.inv_number = formData.invoiceNumber;
    if (formData.invoiceDate !== undefined) updateFields.inv_date = formData.invoiceDate;
    if (formData.amount !== undefined) updateFields.total_amount = formData.amount;
    if (formData.creditTerm !== undefined) updateFields.due_days = formData.creditTerm;
    if (formData.dueDate !== undefined) updateFields.due_date = formData.dueDate;
    if (formData.remark !== undefined) updateFields.remark = formData.remark;
    if (formData.debit !== undefined) updateFields.dr_amount = formData.debit;
    if (formData.credit !== undefined) updateFields.cr_amount = formData.credit;
    if (formData.whtAmount !== undefined) updateFields.total_wht = formData.whtAmount;
    if (formData.vatType !== undefined) updateFields.vat_type = formData.vatType;
    if (formData.receiveNumber !== undefined) updateFields.receive_voucher = formData.receiveNumber;
    if (formData.vatNumber !== undefined) updateFields.vat_number = formData.vatNumber;
    if (formData.poNumber !== undefined) updateFields.po_number = formData.poNumber;
    if (formData.transactionType !== undefined) updateFields.ap_type_code = formData.transactionType;
    if (formData.whtCode !== undefined) updateFields.wht_code = formData.whtCode;
    if (formData.periodMonth !== undefined) updateFields.period_month = formData.periodMonth;
    if (formData.periodYear !== undefined) updateFields.period_year = formData.periodYear;

    if (formData.items && formData.items.length > 0) {
      await supabase.from("invoice_items").delete().eq("invoice_id", id);

      const supplierId = formData.supplierId ?? existing.supplier_id;

      const detailRows = formData.items.map((item, index) => ({
        invoice_id: id,
        line_no: index + 1,
        gl_account: item.glAccount,
        description: item.description || null,
        dr_amount: item.debit,
        cr_amount: item.credit,
      }));

      const { error: detailError } = await supabase
        .from("invoice_items")
        .insert(detailRows);

      if (detailError) throw new AppError(detailError.message);
    }

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    return this.mapInvoice(updated);
  }

  async delete(id: string): Promise<void> {
    if (!(await canDelete(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to delete voucher", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("Invoice", id);
    }

    await this.validatePeriodOpen(existing.period_month, existing.period_year);

    const { error: detailError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id);

    if (detailError) throw new AppError(detailError.message);

    const { error: headerError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (headerError) throw new AppError(headerError.message);

    await this.recalcVendorBalance(existing.supplier_code as string);

    await logAudit({
      tableName: "invoices",
      recordId: id,
      action: "delete",
      oldData: { docNumber: existing.doc_number, amount: existing.total_amount },
      detail: `Hard deleted voucher ${existing.doc_number}`,
    });
  }

  async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to cancel voucher", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("invoices")
      .select("id, status, supplier_code, period_month, period_year")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("Invoice", id);
    }

    if (["cancelled", "voided"].includes(existing.status as string)) {
      throw new AppError("Invoice is already cancelled or voided", "ALREADY_CANCELLED", 422);
    }

    if (existing.status === "paid") {
      throw new AppError("Cannot cancel a paid invoice. Cancel the payment first.", "INVOICE_PAID", 422);
    }

    await this.validatePeriodOpen(existing.period_month as string, existing.period_year as string);

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
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
      await glPostingService.cancelJournalEntries("invoice", id);
    } catch {
      // GL cancellation failure should not block invoice cancel
    }

    await logAudit({
      tableName: "invoices",
      recordId: id,
      action: "cancel",
      oldData: { status: existing.status },
      newData: { status: "cancelled" },
      detail: reason,
    });

    return this.mapInvoice(updated);
  }

  async markForPayment(ids: string[], supplierCode: string, periodMonth: string, periodYear: string): Promise<void> {
    const supabase = await this.getClient();

    await this.validatePeriodOpen(periodMonth, periodYear);

    const { error } = await supabase
      .from("invoices")
      .update({ status: VOUCHER_STATUS.PENDING_APPROVAL })
      .in("id", ids);

    if (error) throw new AppError(error.message);
  }

  async search(params: InvoiceListParams): Promise<InvoiceListResult> {
    return this.list(params);
  }

  async getOutstanding(supplierCode?: string): Promise<InvoiceOutstanding[]> {
    const supabase = await this.getClient();

    let query = supabase
      .from("invoices")
      .select("*, vendor:vendors(code, name_en)")
      .eq("status", VOUCHER_STATUS.PENDING_APPROVAL);

    if (supplierCode) {
      query = query.eq("supplier_code", supplierCode);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      documentNumber: row.doc_number as string,
      documentDate: row.doc_date as string,
      supplierCode: row.supplier_code as string,
      invoiceNumber: row.inv_number as string,
      amount: row.total_amount as number,
      debit: row.dr_amount as number,
      credit: row.cr_amount as number,
      whtAmount: row.total_wht as number,
      balanceAmount: ((row.total_amount as number) - (row.paid_amount as number ?? 0) - (row.dr_amount as number ?? 0)),
      dueDate: row.due_date as string,
      creditTerm: row.due_days as number,
      status: row.status as string as VoucherStatus,
      supplierName: (row.vendor as Record<string, unknown>)?.name_en as string ?? "",
    }));
  }

  private async generateDocNumber(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<string> {
    const { data, error } = await supabase.rpc("next_doc_number", {
      p_table: "invoices",
      p_field: "doc_number",
      p_prefix: "VC",
      p_digits: 5,
    });
    if (error) throw new AppError(error.message);
    return data as string;
  }

  private async resolveSupplierId(supabase: Awaited<ReturnType<typeof createServerClient>>, supplierCode: string): Promise<string> {
    const { data, error } = await supabase
      .from("vendors")
      .select("id")
      .eq("code", supplierCode)
      .single();

    if (error || !data) throw new AppError(`Vendor not found: ${supplierCode}`);
    return data.id as string;
  }

  private async validatePeriodOpen(periodMonth: string, periodYear: string): Promise<void> {
    const supabase = await this.getClient();

    const { data: period, error } = await supabase
      .from("periods")
      .select("closed")
      .eq("period_month", periodMonth)
      .eq("period_year", periodYear)
      .single();

    if (error) throw new AppError("Failed to validate period");
    if (period?.closed) {
      throw new PeriodClosedError(`${periodYear}/${periodMonth}`);
    }
  }

  private async validateDuplicateDocNo(docNo: string): Promise<void> {
    const supabase = await this.getClient();

    const { data: config } = await supabase
      .from("config")
      .select("chk_vc_dup")
      .single();

    if (config?.chk_vc_dup) {
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("doc_number", docNo)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new DuplicateError("documentNumber", docNo);
      }
    }
  }

  private async validateDuplicateInvNo(invNo: string): Promise<void> {
    const supabase = await this.getClient();

    const { data: config } = await supabase
      .from("config")
      .select("chk_inv_dup")
      .single();

    if (config?.chk_inv_dup && invNo) {
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("inv_number", invNo)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new DuplicateError("invoiceNumber", invNo);
      }
    }
  }

  private calculateTotals(formData: InvoiceFormData): { totalNoVat: number; totalVat: number; totalApTrade: number } {
    let totalNoVat = 0;
    let totalVat = 0;

    for (const item of formData.items) {
      let result;
      switch (formData.vatType) {
        case "inclusive":
          result = calculateVatInclusive(item.debit || item.credit);
          break;
        case "exclusive":
          result = calculateVatExclusive(item.debit || item.credit);
          break;
        case "exempt":
          result = calculateNoVat(item.debit || item.credit);
          break;
        default:
          result = calculateNoVat(item.debit || item.credit);
          break;
      }
      totalNoVat += result.baseAmount;
      totalVat += result.vatAmount;
    }

    const whtAmount = formData.whtAmount || calculateWhtAmount(totalNoVat, 0);
    const totalApTrade = totalNoVat + totalVat - whtAmount;

    return {
      totalNoVat: Math.round(totalNoVat * 100) / 100,
      totalVat: Math.round(totalVat * 100) / 100,
      totalApTrade: Math.round(totalApTrade * 100) / 100,
    };
  }

  private async recalcVendorBalance(supplierCode: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase.rpc("recalculate_vendor_balance", {
      p_vendor_code: supplierCode,
    });
    if (error) {
      console.error("Failed to recalculate vendor balance:", error.message);
    }
  }

  private mapInvoice(row: Record<string, unknown>): Invoice {
    return {
      id: row.id as string,
      documentNumber: row.doc_number as string,
      documentDate: row.doc_date as string,
      supplierCode: row.supplier_code as string,
      supplierId: row.supplier_id as string,
      invoiceNumber: row.inv_number as string,
      invoiceDate: row.inv_date as string | null,
      amount: row.total_amount as number,
      creditTerm: row.due_days as number,
      dueDate: row.due_date as string,
      remark: row.remark as string | null,
      debit: row.dr_amount as number,
      credit: row.cr_amount as number,
      whtAmount: row.total_wht as number,
      whtCode: row.wht_code as string | null,
      vatType: row.vat_type as VatMode,
      status: row.status as VoucherStatus,
      receiveNumber: row.receive_voucher as string | null,
      vatNumber: row.vat_number as string | null,
      poNumber: row.po_number as string | null,
      transactionType: row.ap_type_code as TransactionType,
      totalNoVat: row.total_no_vat as number,
      totalVat: row.total_vat as number,
      balance: row.balance as number,
      paidAmount: row.paid_amount as number,
      drAmount: row.dr_amount as number,
      periodMonth: row.period_month as string,
      periodYear: row.period_year as string,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapInvoiceItem(row: Record<string, unknown>): InvoiceItem {
    return {
      id: row.id as string,
      invoiceId: row.invoice_id as string,
      lineNo: row.line_no as number,
      glAccount: row.gl_account as string,
      description: row.description as string | null,
      debit: row.dr_amount as number,
      credit: row.cr_amount as number,
    };
  }
}

export const postingService = new PostingService();