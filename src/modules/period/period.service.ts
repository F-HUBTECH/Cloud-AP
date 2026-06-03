import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";
import { logAudit } from "@/lib/utils/audit";

export interface PeriodCloseResult {
  periodId: string;
  periodYear: string;
  periodMonth: string;
  vendorsProcessed: number;
  balancesCreated: number;
}

export interface YearEndResult {
  periodsClosed: number;
  vendorsProcessed: number;
  nextYearCreated: boolean;
}

export class PeriodService {
  async closeMonth(periodId: string): Promise<PeriodCloseResult> {
    const supabase = await createServerClient();

    const { data: period, error: periodError } = await supabase
      .from("periods")
      .select("id, period_year, period_month, closed")
      .eq("id", periodId)
      .single();

    if (periodError || !period) throw new NotFoundError("Period", periodId);
    if (period.closed) throw new AppError("Period is already closed", "PERIOD_ERROR");

    const periodYear = String(period.period_year);
    const periodMonth = String(period.period_month).padStart(2, "0");

    const { data: validationMsg } = await supabase.rpc("validate_period_can_close", {
      p_year: periodYear,
      p_month: periodMonth,
    });

    if (validationMsg) {
      throw new AppError(`Cannot close period: ${validationMsg}`, "PERIOD_HAS_PENDING", 422);
    }

    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select("id, code, total_amount, total_payment, open_amount")
      .eq("is_active", true);

    if (vendorsError) throw new AppError(`Failed to fetch vendors: ${vendorsError.message}`, "PERIOD_ERROR");

    let balancesCreated = 0;

    for (const vendor of vendors ?? []) {
      const openAmount = Number(vendor.open_amount) || 0;
      const totalAmount = Number(vendor.total_amount) || 0;
      const totalPayment = Number(vendor.total_payment) || 0;
      const invAmount = totalAmount - totalPayment + openAmount;
      const balance = totalAmount - totalPayment;

      const { error: upsertError } = await supabase
        .from("vendor_monthly_balances")
        .upsert(
          {
            vendor_id: vendor.id,
            period_year: periodYear,
            period_month: periodMonth,
            open_amount: openAmount,
            inv_amount: invAmount > 0 ? invAmount : 0,
            dr_amount: 0,
            apply_amount: 0,
            paid_amount: totalPayment > 0 ? totalPayment : 0,
            balance: balance,
          },
          { onConflict: "vendor_id,period_year,period_month" }
        );

      if (!upsertError) balancesCreated++;
    }

    const { error: closeError } = await supabase
      .from("periods")
      .update({
        closed: true,
        closed_at: new Date().toISOString(),
        closed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq("id", periodId);

    if (closeError) throw new AppError(`Failed to close period: ${closeError.message}`, "PERIOD_ERROR");

    await logAudit({
      tableName: "periods",
      recordId: periodId,
      action: "update",
      oldData: { closed: false },
      newData: { closed: true, periodYear, periodMonth },
      detail: `Closed period ${periodYear}/${periodMonth}`,
    });

    return {
      periodId,
      periodYear,
      periodMonth,
      vendorsProcessed: vendors?.length ?? 0,
      balancesCreated,
    };
  }

  async closeYear(year: string): Promise<YearEndResult> {
    const supabase = await createServerClient();

    const { data: periods, error: periodsError } = await supabase
      .from("periods")
      .select("id, period_year, period_month, closed")
      .eq("period_year", year)
      .eq("closed", false);

    if (periodsError) throw new AppError(`Failed to fetch periods: ${periodsError.message}`, "PERIOD_ERROR");
    if (!periods || periods.length === 0) throw new AppError(`No open periods found for year ${year}`, "PERIOD_ERROR");

    let periodCount = 0;
    for (const period of periods) {
      try {
        await this.closeMonth(period.id);
        periodCount++;
      } catch {
        // Continue closing remaining periods even if one fails
      }
    }

    const nextYear = String(Number(year) + 1);
    const { data: existingNext } = await supabase
      .from("periods")
      .select("id")
      .eq("period_year", nextYear)
      .limit(1);

    let nextYearCreated = false;
    if (!existingNext || existingNext.length === 0) {
      const months = [
        "01", "02", "03", "04", "05", "06",
        "07", "08", "09", "10", "11", "12",
      ];
      const newPeriods = months.map((m) => ({
        period_year: nextYear,
        period_month: m,
        date_from: `${nextYear}-${m}-01`,
        date_to: new Date(Number(nextYear), Number(m), 0).toISOString().slice(0, 10),
        closed: false,
      }));

      const { error: insertError } = await supabase
        .from("periods")
        .insert(newPeriods);

      if (!insertError) nextYearCreated = true;
    }

    const { data: vendors } = await supabase
      .from("vendors")
      .select("id")
      .eq("is_active", true);

    return {
      periodsClosed: periodCount,
      vendorsProcessed: vendors?.length ?? 0,
      nextYearCreated,
    };
  }

  async reopenPeriod(periodId: string): Promise<void> {
    const supabase = await createServerClient();

    const { data: period } = await supabase
      .from("periods")
      .select("id, closed")
      .eq("id", periodId)
      .maybeSingle();

    if (!period) throw new NotFoundError("Period", periodId);
    if (!period.closed) throw new AppError("Period is already open", "PERIOD_ERROR");

    const { error } = await supabase
      .from("periods")
      .update({ closed: false, closed_at: null, closed_by: null })
      .eq("id", periodId);

    if (error) throw new AppError(`Failed to reopen period: ${error.message}`, "PERIOD_ERROR");

    await logAudit({
      tableName: "periods",
      recordId: periodId,
      action: "update",
      oldData: { closed: true },
      newData: { closed: false },
      detail: "Reopened period",
    });
  }
}

export const periodService = new PeriodService();