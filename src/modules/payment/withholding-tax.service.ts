import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";
import { calculateWhtAmount } from "@/lib/utils/calculate-wht";
import type { WithholdingTax, WhtPerSupplier } from "./payment.types";

class WHTService {
  private async getClient() {
    return createServerClient();
  }

  async generateWht(paymentId: string): Promise<WithholdingTax[]> {
    const supabase = await this.getClient();

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, doc_number, doc_date, supplier_code, supplier_id, total_amount, total_wht")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    const paymentInvoices = await supabase
      .from("payment_invoices")
      .select("wht_amount")
      .eq("payment_id", paymentId);

    const totalWhtFromInvoices =
      paymentInvoices.data?.reduce((sum, pi) => sum + (pi.wht_amount ?? 0), 0) ?? 0;

    const existingWhts = await supabase
      .from("withholding_taxes")
      .select("*")
      .eq("payment_id", paymentId);

    if (existingWhts.data && existingWhts.data.length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from("withholding_taxes")
        .update({
          base_amount: payment.total_amount,
          tax_amount: totalWhtFromInvoices || payment.total_wht,
          doc_date: payment.doc_date,
        })
        .eq("payment_id", paymentId)
        .select();

      if (updateError) throw new AppError(updateError.message);

      const { data: whtCodes } = await supabase
        .from("withholding_taxes")
        .select("wht_code")
        .eq("payment_id", paymentId);

      if (whtCodes && whtCodes.length > 0) {
        await this.upsertWhtPerSupplier(
          payment.supplier_code,
          payment.doc_number,
          payment.doc_date,
          whtCodes[0].wht_code,
          payment.total_amount,
          totalWhtFromInvoices || payment.total_wht,
        );
      }

      return (updated ?? []) as WithholdingTax[];
    }

    const { data: whtEntries } = await supabase
      .from("payment_invoices")
      .select("wht_amount")
      .eq("payment_id", paymentId);

    const whtAmount = whtEntries?.reduce((sum, pi) => sum + (pi.wht_amount ?? 0), 0) ?? payment.total_wht;

    const { data: created, error: createError } = await supabase
      .from("withholding_taxes")
      .insert({
        payment_id: paymentId,
        doc_number: payment.doc_number,
        wht_code: "DEFAULT",
        wht_rate: 0,
        base_amount: payment.total_amount,
        tax_amount: whtAmount,
        condition_pay: 3,
        doc_date: payment.doc_date,
      })
      .select()
      .single();

    if (createError) throw new AppError(createError.message);

    await this.upsertWhtPerSupplier(
      payment.supplier_code,
      payment.doc_number,
      payment.doc_date,
      "DEFAULT",
      payment.total_amount,
      whtAmount,
    );

    return [created as WithholdingTax];
  }

  async generateWhtWithCode(
    paymentId: string,
    whtCode: string,
    baseAmount: number,
  ): Promise<WithholdingTax> {
    const supabase = await this.getClient();

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, doc_number, doc_date, supplier_code")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    const { data: whtConfig } = await supabase
      .from("wht_codes")
      .select("code, rate, wht_type")
      .eq("code", whtCode)
      .single();

    const whtRate = whtConfig?.rate ?? 0;
    const whtType = whtConfig?.wht_type ?? null;
    const taxAmount = calculateWhtAmount(baseAmount, whtRate);

    const { data: existing } = await supabase
      .from("withholding_taxes")
      .select("id")
      .eq("payment_id", paymentId)
      .eq("wht_code", whtCode)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("withholding_taxes")
        .update({
          wht_rate: whtRate,
          base_amount: baseAmount,
          tax_amount: taxAmount,
          wht_type: whtType,
          doc_date: payment.doc_date,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) throw new AppError(updateError.message);

      await this.upsertWhtPerSupplier(
        payment.supplier_code,
        payment.doc_number,
        payment.doc_date,
        whtCode,
        baseAmount,
        taxAmount,
      );

      return updated as WithholdingTax;
    }

    const { data: created, error: createError } = await supabase
      .from("withholding_taxes")
      .insert({
        payment_id: paymentId,
        doc_number: payment.doc_number,
        wht_code: whtCode,
        wht_rate: whtRate,
        base_amount: baseAmount,
        tax_amount: taxAmount,
        wht_type: whtType,
        condition_pay: 3,
        doc_date: payment.doc_date,
      })
      .select()
      .single();

    if (createError) throw new AppError(createError.message);

    await this.upsertWhtPerSupplier(
      payment.supplier_code,
      payment.doc_number,
      payment.doc_date,
      whtCode,
      baseAmount,
      taxAmount,
    );

    return created as WithholdingTax;
  }

  async cancelWht(paymentId: string, reason: string): Promise<void> {
    const supabase = await this.getClient();

    const { data: whtRecords, error: whtError } = await supabase
      .from("withholding_taxes")
      .select("id, doc_number")
      .eq("payment_id", paymentId);

    if (whtError || !whtRecords || whtRecords.length === 0) {
      throw new NotFoundError("Withholding tax record", paymentId);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? null;

    const { data: payment } = await supabase
      .from("payments")
      .select("supplier_code")
      .eq("id", paymentId)
      .single();

    if (payment?.supplier_code) {
      for (const wht of whtRecords) {
        await supabase
          .from("wht_per_supplier")
          .update({
            is_cancelled: true,
            cancelled_by: userId,
            cancelled_at: new Date().toISOString(),
            cancel_reason: reason,
          })
          .eq("supplier_code", payment.supplier_code)
          .eq("doc_number", wht.doc_number);
      }
    }

    const { error: deleteError } = await supabase
      .from("withholding_taxes")
      .delete()
      .eq("payment_id", paymentId);

    if (deleteError) throw new AppError(deleteError.message);
  }

  async getWhtByPaymentId(paymentId: string): Promise<WithholdingTax[]> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("withholding_taxes")
      .select("*")
      .eq("payment_id", paymentId);

    if (error) throw new AppError(error.message);

    return (data ?? []) as WithholdingTax[];
  }

  async printWht50(paymentId: string): Promise<WithholdingTax & Partial<WhtPerSupplier>> {
    const supabase = await this.getClient();

    const { data: whtRecords, error: whtError } = await supabase
      .from("withholding_taxes")
      .select("*")
      .eq("payment_id", paymentId);

    if (whtError || !whtRecords || whtRecords.length === 0) {
      throw new NotFoundError("Withholding tax record", paymentId);
    }

    const wht = whtRecords[0] as WithholdingTax;

    const { data: payment } = await supabase
      .from("payments")
      .select("supplier_code")
      .eq("id", paymentId)
      .single();

    if (!payment?.supplier_code) {
      throw new NotFoundError("Payment for WHT", paymentId);
    }

    const { data: whtSupplier } = await supabase
      .from("wht_per_supplier")
      .select("*")
      .eq("supplier_code", payment.supplier_code)
      .eq("doc_number", wht.doc_number)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (whtSupplier) {
      return { ...wht, supplier_code: whtSupplier.supplier_code, wht_date: whtSupplier.wht_date, is_cancelled: whtSupplier.is_cancelled, cancelled_at: whtSupplier.cancelled_at, cancelled_by: whtSupplier.cancelled_by, cancel_reason: whtSupplier.cancel_reason } as WithholdingTax & Partial<WhtPerSupplier>;
    }

    return {
      ...wht,
      supplier_code: payment.supplier_code,
      wht_date: wht.doc_date,
      base_amount: wht.base_amount,
      tax_amount: wht.tax_amount,
      condition_pay: wht.condition_pay ?? 3,
      is_cancelled: false,
      cancelled_at: null,
      cancelled_by: null,
      cancel_reason: null,
    };
  }

  private async upsertWhtPerSupplier(
    supplierCode: string,
    docNumber: string,
    whtDate: string,
    whtCode: string,
    baseAmount: number,
    taxAmount: number,
  ): Promise<void> {
    const supabase = await this.getClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? null;

    const { data: whtConfig } = await supabase
      .from("wht_codes")
      .select("wht_type")
      .eq("code", whtCode)
      .single();

    const { data: existing } = await supabase
      .from("wht_per_supplier")
      .select("id")
      .eq("supplier_code", supplierCode)
      .eq("doc_number", docNumber)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("wht_per_supplier")
        .update({
          wht_code: whtCode,
          wht_rate: baseAmount > 0 ? taxAmount / baseAmount : 0,
          base_amount: baseAmount,
          tax_amount: taxAmount,
          wht_type: whtConfig?.wht_type ?? null,
          wht_date: whtDate,
          updated_by: userId,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("wht_per_supplier").insert({
        supplier_code: supplierCode,
        doc_number: docNumber,
        wht_code: whtCode,
        wht_rate: baseAmount > 0 ? taxAmount / baseAmount : 0,
        base_amount: baseAmount,
        tax_amount: taxAmount,
        wht_type: whtConfig?.wht_type ?? null,
        condition_pay: 3,
        is_cancelled: false,
        wht_date: whtDate,
        created_by: userId,
      });
    }
  }
}

export const whtService = new WHTService();