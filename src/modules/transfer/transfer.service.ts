import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
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
    const supabase = await this.getClient();
    const { data, error } = await supabase.rpc("transfer_ap_voucher", {
      p_invoice_id: formData.source_invoice_id,
      p_to_vendor_id: formData.to_vendor_id,
      p_transfer_date: formData.doc_date,
      p_remark: formData.remark,
    });
    if (error) throw new AppError(error.message, "TRANSFER_ERROR");
    return data as Transfer;
  }

  async cancel(id: string): Promise<Transfer> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.rpc("cancel_ap_voucher_transfer", { p_transfer_id: id });
    if (error) throw new AppError(error.message, "TRANSFER_ERROR");
    return data as Transfer;
  }

  async delete(_id: string): Promise<void> {
    throw new AppError("Transfer history must be retained. Cancel the transfer instead.", "TRANSFER_ERROR");
  }
}

export const transferService = new TransferService();
