import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, DuplicateError, AppError, AuthorizationError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE, MODULE_CODES } from "@/lib/constants";
import { canCreate, canDelete } from "@/lib/utils/permissions";
import { glPostingService } from "@/modules/gl-posting/gl-posting.service";
import { getGLTradeAccount } from "@/lib/utils/gl-helpers";
import { logAudit } from "@/lib/utils/audit";
import type {
  Transfer,
  TransferWithVendors,
  TransferFormData,
  TransferListParams,
  TransferListResult,
} from "./transfer.types";

export class TransferService {
  private async getClient() {
    return createServerClient();
  }

  async list(params: TransferListParams = {}): Promise<TransferListResult> {
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      search,
      status,
      dateFrom,
      dateTo,
    } = params;

    const supabase = await this.getClient();

    let query = supabase
      .from("transfers")
      .select("*, from_vendor:vendors!transfers_from_vendor_id_fkey(code, name_en, name_th), to_vendor:vendors!transfers_to_vendor_id_fkey(code, name_en, name_th)", { count: "exact" })
      .order("transfer_date", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (dateFrom) {
      query = query.gte("transfer_date", dateFrom);
    }

    if (dateTo) {
      query = query.lte("transfer_date", dateTo);
    }

    if (search) {
      query = query.or(
        `doc_number.ilike.%${search}%,from_vendor_code.ilike.%${search}%,to_vendor_code.ilike.%${search}%,remark.ilike.%${search}%`,
      );
    }

    const { data, count, error } = await query;

    if (error) throw new AppError(`Failed to fetch transfers: ${error.message}`, "TRANSFER_ERROR");

    return {
      data: (data as TransferWithVendors[]) ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  }

  async getById(id: string): Promise<TransferWithVendors> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("transfers")
      .select("*, from_vendor:vendors!transfers_from_vendor_id_fkey(code, name_en, name_th), to_vendor:vendors!transfers_to_vendor_id_fkey(code, name_en, name_th)")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Transfer", id);

    return data as TransferWithVendors;
  }

  async create(formData: TransferFormData): Promise<Transfer> {
    if (!(await canCreate(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to create transfer", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AuthorizationError("Authentication required");

    if (formData.from_vendor_id === formData.to_vendor_id) {
      throw new AppError("Source and destination vendor cannot be the same", "TRANSFER_ERROR");
    }

    const amount = Number(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new AppError("Transfer amount must be greater than zero", "TRANSFER_ERROR");
    }

    const fromVendor = await this._getVendorCode(formData.from_vendor_id);
    const toVendor = await this._getVendorCode(formData.to_vendor_id);

    const { data: docNumberResult } = await supabase.rpc("next_doc_number", {
      p_table: "transfers",
      p_field: "doc_number",
      p_group: "TRF",
      p_prefix: "TRF",
      p_digits: 5,
    });

    const docNumber = docNumberResult ?? `TRF${String(Date.now()).slice(-5)}`;

    const { data, error } = await supabase
      .from("transfers")
      .insert({
        doc_number: docNumber,
        transfer_date: formData.doc_date,
        from_vendor_id: formData.from_vendor_id,
        from_vendor_code: fromVendor,
        to_vendor_id: formData.to_vendor_id,
        to_vendor_code: toVendor,
        amount,
        remark: formData.remark || null,
        status: "active",
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new DuplicateError("doc_number", docNumber);
      }
      throw new AppError(`Failed to create transfer: ${error.message}`, "TRANSFER_ERROR");
    }

    await this._updateVendorBalances(fromVendor, toVendor);

    try {
      const tradeGl = await getGLTradeAccount(await this.getClient());

      await glPostingService.createJournalEntry({
        sourceType: "transfer",
        sourceId: (data as Record<string, unknown>).id as string,
        docNumber,
        docDate: formData.doc_date,
        periodYear: formData.doc_date?.slice(0, 4) ?? "",
        periodMonth: formData.doc_date?.slice(5, 7) ?? "",
        description: `Transfer ${docNumber}: ${fromVendor} → ${toVendor}`,
        lines: [
          { glAccount: tradeGl, description: `Transfer out ${fromVendor}`, debit: amount, credit: 0 },
          { glAccount: tradeGl, description: `Transfer in ${toVendor}`, debit: 0, credit: amount },
        ],
        createdBy: user.id,
      });
    } catch {
      // GL posting failure should not block transfer
    }

    await logAudit({
      tableName: "transfers",
      recordId: (data as Record<string, unknown>).id as string,
      action: "create",
      newData: { docNumber, fromVendor, toVendor, amount },
      detail: `Created transfer ${docNumber}: ${fromVendor} → ${toVendor}`,
    });

    return data as Transfer;
  }

  async cancel(id: string): Promise<Transfer> {
    if (!(await canDelete(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to cancel transfer", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing } = await supabase
      .from("transfers")
      .select("id, status, from_vendor_id, to_vendor_id, from_vendor_code, to_vendor_code, amount, doc_number, remark")
      .eq("id", id)
      .maybeSingle();

    if (!existing) throw new NotFoundError("Transfer", id);
    if (existing.status === "cancelled") {
      throw new AppError("Transfer is already cancelled", "TRANSFER_ERROR");
    }

    const { data: { user: _user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("transfers")
      .update({
        status: "cancelled",
        remark: (existing as Record<string, unknown>).remark ? `${(existing as Record<string, unknown>).remark} [CANCELLED]` : "[CANCELLED]",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError(`Failed to cancel transfer: ${error.message}`, "TRANSFER_ERROR");

    const fromVendorCode = (existing as Record<string, unknown>).from_vendor_code as string;
    const toVendorCode = (existing as Record<string, unknown>).to_vendor_code as string;

    if (fromVendorCode && toVendorCode) {
      await this._updateVendorBalances(fromVendorCode, toVendorCode);
    }

    try {
      await glPostingService.cancelJournalEntries("transfer", id);
    } catch {
      // GL cancellation failure should not block transfer cancel
    }

    await logAudit({
      tableName: "transfers",
      recordId: id,
      action: "cancel",
      oldData: { status: existing.status },
      newData: { status: "cancelled" },
      detail: `Cancelled transfer ${(existing as Record<string, unknown>).doc_number}`,
    });

    return data as Transfer;
  }

  async delete(id: string): Promise<void> {
    if (!(await canDelete(MODULE_CODES.VOUCHER_AP))) {
      throw new AppError("No permission to delete transfer", "FORBIDDEN", 403);
    }

    const supabase = await this.getClient();

    const { data: existing } = await supabase
      .from("transfers")
      .select("id, status, from_vendor_id, to_vendor_id, from_vendor_code, to_vendor_code, amount, doc_number")
      .eq("id", id)
      .maybeSingle();

    if (!existing) throw new NotFoundError("Transfer", id);

    if (existing.status === "active") {
      const fromVendorCode = (existing as Record<string, unknown>).from_vendor_code as string;
      const toVendorCode = (existing as Record<string, unknown>).to_vendor_code as string;
      if (fromVendorCode && toVendorCode) {
        await this._updateVendorBalances(fromVendorCode, toVendorCode);
      }
    }

    const { error } = await supabase.from("transfers").delete().eq("id", id);

    if (error) throw new AppError(`Failed to delete transfer: ${error.message}`, "TRANSFER_ERROR");

    await logAudit({
      tableName: "transfers",
      recordId: id,
      action: "delete",
      oldData: { docNumber: (existing as Record<string, unknown>).doc_number },
      detail: `Hard deleted transfer ${(existing as Record<string, unknown>).doc_number}`,
    });
  }

  private async _getVendorCode(vendorId: string): Promise<string> {
    const supabase = await this.getClient();
    const { data } = await supabase
      .from("vendors")
      .select("code")
      .eq("id", vendorId)
      .single();
    return data?.code ?? "";
  }

  private async _updateVendorBalances(
    fromVendorCode: string,
    toVendorCode: string,
  ): Promise<void> {
    const supabase = await this.getClient();

    await supabase.rpc("recalculate_vendor_balance", {
      p_vendor_code: fromVendorCode,
    });

    await supabase.rpc("recalculate_vendor_balance", {
      p_vendor_code: toVendorCode,
    });
  }
}

export const transferService = new TransferService();