import { AppError, PeriodClosedError } from "@/lib/errors";
import type { createServerClient } from "@/lib/supabase/server";

export async function validatePeriodOpen(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  periodMonth: string,
  periodYear: string
): Promise<void> {
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
