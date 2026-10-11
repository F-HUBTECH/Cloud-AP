import { createServerClient } from "@/lib/supabase/server";
import { AppError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { canRead } from "@/lib/utils/permissions";
import { MODULE_CODES } from "@/lib/constants";
import type { ChequePrintData } from "./cheque";

export async function loadChequePrintData(id: string): Promise<ChequePrintData> {
  if (!(await canRead(MODULE_CODES.VOUCHER_PAYMENT))) throw new AuthorizationError();
  const supabase = await createServerClient();
  const { data: payment, error } = await supabase.from("payments")
    .select("id, doc_number, cheque_number, cheque_date, supplier_id, bank_name, bank_code, currency, total_net, status, pay_method, updated_at")
    .eq("id", id).maybeSingle();
  if (error) throw new AppError("ไม่สามารถอ่านข้อมูล Payment ได้");
  if (!payment) throw new NotFoundError("Payment");
  if (payment.pay_method !== "cheque") throw new AppError("รายการนี้ไม่ได้จ่ายด้วยเช็ค", "INVALID_PAYMENT_METHOD", 400);
  const { data: vendor, error: vendorError } = await supabase.from("vendors")
    .select("name_th, name_en").eq("id", payment.supplier_id).maybeSingle();
  if (vendorError) throw new AppError("ไม่สามารถอ่านชื่อผู้รับเงินได้");
  return {
    id: payment.id, documentNumber: payment.doc_number,
    chequeNumber: payment.cheque_number ?? "", chequeDate: payment.cheque_date ?? "",
    payee: vendor?.name_th?.trim() || vendor?.name_en?.trim() || "",
    bankName: payment.bank_name ?? "", bankCode: payment.bank_code ?? "",
    currency: payment.currency ?? "", amount: payment.total_net,
    status: payment.status, updatedAt: payment.updated_at,
  };
}
