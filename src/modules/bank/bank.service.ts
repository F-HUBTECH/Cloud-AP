import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE, MODULE_CODES } from "@/lib/constants";
import { canCreate, canUpdate } from "@/lib/utils/permissions";
import type { BankReconciliation, ChequeTransaction, BankReconciliationFormData, BankReconciliationWithDetails, BankReconciliationListParams, BankReconciliationListResult } from "./bank.types";

class BankReconService {
  private async getClient() {
    return createServerClient();
  }

  async list(params: BankReconciliationListParams = {}): Promise<BankReconciliationListResult> {
    const supabase = await this.getClient();
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      bankCode,
      isReconciled,
      dateFrom,
      dateTo,
      search,
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("bank_reconciliations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (bankCode) query = query.eq("bank_code", bankCode);
    if (isReconciled !== undefined) query = query.eq("is_reconciled", isReconciled);
    if (dateFrom) query = query.gte("statement_date", dateFrom);
    if (dateTo) query = query.lte("statement_date", dateTo);
    if (search) {
      query = query.or(`bank_code.ilike.%${search}%,bank_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message);

    return {
      data: (data ?? []).map(this.mapReconciliation),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<BankReconciliationWithDetails> {
    const supabase = await this.getClient();

    const { data: header, error: headerError } = await supabase
      .from("bank_reconciliations")
      .select("*")
      .eq("id", id)
      .single();

    if (headerError || !header) {
      throw new NotFoundError("BankReconciliation", id);
    }

    const { data: cheques, error: chequesError } = await supabase
      .from("cheque_transactions")
      .select("*")
      .eq("bank_code", header.bank_code)
      .order("created_at", { ascending: true });

    if (chequesError) throw new AppError(chequesError.message);

    return {
      ...this.mapReconciliation(header),
      cheques: (cheques ?? []).map(this.mapChequeTransaction),
    };
  }

  async create(formData: BankReconciliationFormData): Promise<BankReconciliation> {
    if (!(await canCreate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to create bank reconciliation", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: bank } = await supabase
      .from("bank_accounts")
      .select("code, name, account_no")
      .eq("code", formData.bankCode)
      .single();

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const insertData: Record<string, unknown> = {
      bank_code: formData.bankCode,
      bank_name: bank?.name || null,
      statement_date: formData.statementDate,
      book_balance: formData.bookBalance,
      is_reconciled: false,
      created_by: authUser?.id ?? null,
    };

    if (formData.chequeDate) insertData.cheque_date = formData.chequeDate;
    if (formData.chequeNumber) insertData.cheque_number = formData.chequeNumber;
    if (formData.amount !== undefined) insertData.amount = formData.amount;
    if (formData.supplierCode) insertData.supplier_code = formData.supplierCode;
    if (formData.remark) insertData.remark = formData.remark;
    if (formData.receivedDate) insertData.received_date = formData.receivedDate;
    if (formData.status) insertData.status = formData.status;

    const { data: header, error: headerError } = await supabase
      .from("bank_reconciliations")
      .insert(insertData)
      .select()
      .single();

    if (headerError) throw new AppError(headerError.message);

    if (formData.cheques && formData.cheques.length > 0) {
      const chequeRows = formData.cheques.map((cheque) => ({
        payment_id: cheque.paymentId || null,
        bank_code: cheque.bankCode,
        bank_name: cheque.bankName || null,
        cheque_date: cheque.chequeDate,
        cheque_number: cheque.chequeNumber,
        remark: cheque.remark || null,
        created_by: authUser?.id ?? null,
      }));

      const { error: chequeError } = await supabase
        .from("cheque_transactions")
        .insert(chequeRows);

      if (chequeError) throw new AppError(chequeError.message);
    }

    return this.mapReconciliation(header);
  }

  async reconcile(id: string): Promise<BankReconciliation> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to reconcile", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("bank_reconciliations")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("BankReconciliation", id);
    }

    if (existing.is_reconciled) {
      throw new AppError("Reconciliation is already completed", "ALREADY_RECONCILED", 422);
    }

    const { data: updated, error: updateError } = await supabase
      .from("bank_reconciliations")
      .update({
        is_reconciled: true,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    return this.mapReconciliation(updated);
  }

  async reconcileCheque(chequeId: string): Promise<ChequeTransaction> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to reconcile cheque", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("cheque_transactions")
      .select("*")
      .eq("id", chequeId)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("ChequeTransaction", chequeId);
    }

    if (existing.cancelled) {
      throw new AppError("Cannot reconcile a cancelled cheque", "CHEQUE_CANCELLED", 422);
    }

    const currentRemark = (existing.remark as string) || "";
    const isAlreadyCleared = currentRemark.includes("[CLEARED]");
    if (isAlreadyCleared) {
      throw new AppError("Cheque is already cleared", "ALREADY_CLEARED", 422);
    }

    const newRemark = currentRemark ? `${currentRemark} [CLEARED]` : "[CLEARED]";

    const { data: updated, error: updateError } = await supabase
      .from("cheque_transactions")
      .update({ remark: newRemark })
      .eq("id", chequeId)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    return this.mapChequeTransaction(updated);
  }

  async cancel(id: string, reason: string): Promise<BankReconciliation> {
    if (!(await canUpdate(MODULE_CODES.VOUCHER_PAYMENT))) {
      throw new AppError("No permission to cancel reconciliation", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing, error: existingError } = await supabase
      .from("bank_reconciliations")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError("BankReconciliation", id);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { data: updated, error: updateError } = await supabase
      .from("bank_reconciliations")
      .update({
        is_reconciled: false,
        cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: authUser?.id ?? null,
        remark: reason,
        status: "cancelled",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    return this.mapReconciliation(updated);
  }

  private mapReconciliation(row: Record<string, unknown>): BankReconciliation {
    return {
      id: row.id as string,
      bankCode: row.bank_code as string,
      bankName: row.bank_name as string | null,
      statementDate: row.statement_date as string | null,
      bookBalance: row.book_balance as number,
      isReconciled: row.is_reconciled as boolean,
      chequeDate: row.cheque_date as string | null,
      chequeNumber: row.cheque_number as string | null,
      remark: row.remark as string | null,
      receivedDate: row.received_date as string | null,
      amount: row.amount as number | null,
      supplierCode: row.supplier_code as string | null,
      status: row.status as string | null,
      cancelled: row.cancelled as boolean,
      cancelledAt: row.cancelled_at as string | null,
      cancelledBy: row.cancelled_by as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapChequeTransaction(row: Record<string, unknown>): ChequeTransaction {
    return {
      id: row.id as string,
      paymentId: row.payment_id as string | null,
      bankCode: row.bank_code as string,
      bankName: row.bank_name as string | null,
      chequeNumber: row.cheque_number as string,
      chequeDate: row.cheque_date as string,
      remark: row.remark as string | null,
      cancelled: row.cancelled as boolean,
      cancelledAt: row.cancelled_at as string | null,
      cancelledBy: row.cancelled_by as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const bankReconService = new BankReconService();