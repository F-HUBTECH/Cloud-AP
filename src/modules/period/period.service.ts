import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

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

    const { data, error } = await supabase.rpc("close_ap_month", { p_period_id: periodId });
    if (error) throw new AppError(error.message, "PERIOD_ERROR");
    return data as PeriodCloseResult;
  }

  async closeYear(year: string): Promise<YearEndResult> {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc("close_ap_year", { p_year: year });
    if (error) throw new AppError(error.message, "PERIOD_ERROR");
    return data as YearEndResult;
  }

  async reopenPeriod(periodId: string): Promise<void> {
    const supabase = await createServerClient();

    const { error } = await supabase.rpc("reopen_ap_period", { p_period_id: periodId });
    if (error) throw new AppError(error.message, "PERIOD_ERROR");
  }
}

export const periodService = new PeriodService();
