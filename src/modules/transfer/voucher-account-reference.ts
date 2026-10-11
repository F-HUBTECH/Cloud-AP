import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

export interface VoucherAccountReference {
  invoiceId: string;
  docNumber: string;
  lines: {
    id: string;
    lineNo: number;
    accountCode: string;
    description: string;
    debit: number;
    credit: number;
  }[];
}

// Read the retained original lines rather than creating accounting lines on a transfer.
// Follow all transfers, including cancelled ones, so historical vouchers keep their reference.
export async function loadVoucherAccountReference(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<VoucherAccountReference | null> {
  const visited = new Set<string>();
  let sourceId = invoiceId;

  while (true) {
    if (visited.has(sourceId)) {
      throw new AppError("Source voucher reference contains a cycle", "TRANSFER_REFERENCE_ERROR");
    }
    visited.add(sourceId);

    const { data: transfer, error } = await supabase
      .from("transfers")
      .select("source_invoice_id")
      .or(`destination_invoice_id.eq.${sourceId},adjustment_invoice_id.eq.${sourceId}`)
      .maybeSingle();
    if (error) {
      throw new AppError("Could not load source voucher reference", "TRANSFER_REFERENCE_ERROR");
    }
    if (!transfer) break;
    if (!transfer.source_invoice_id) {
      throw new AppError("Source voucher reference is missing", "TRANSFER_REFERENCE_ERROR");
    }
    sourceId = transfer.source_invoice_id;
  }

  if (sourceId === invoiceId) return null;

  const [{ data: source, error: sourceError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("invoices").select("id, doc_number").eq("id", sourceId).single(),
    supabase.from("invoice_items")
      .select("id, line_no, gl_account, description, dr_amount, cr_amount")
      .eq("invoice_id", sourceId).order("line_no"),
  ]);
  if (sourceError || itemsError || !source) {
    throw new AppError("Could not load source voucher accounting details", "TRANSFER_REFERENCE_ERROR");
  }

  return {
    invoiceId: source.id,
    docNumber: source.doc_number,
    lines: (items ?? []).map((item) => ({
      id: item.id,
      lineNo: item.line_no,
      accountCode: item.gl_account ?? "",
      description: item.description ?? "",
      debit: Number(item.dr_amount) || 0,
      credit: Number(item.cr_amount) || 0,
    })),
  };
}
