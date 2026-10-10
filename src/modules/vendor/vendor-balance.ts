import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export async function getVendorBalancePeriod() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("config")
    .select("period_year, period_month")
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(error.message);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit",
  }).formatToParts(new Date());
  return {
    year: data?.period_year || today.find((part) => part.type === "year")!.value,
    month: (data?.period_month || today.find((part) => part.type === "month")!.value).padStart(2, "0"),
  };
}

export async function getVendorPeriodBalance(vendorId: string, year: string, month: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("vendor_period_balance", {
    p_vendor_id: vendorId, p_year: year, p_month: month,
  });
  if (error) throw new AppError(`Failed to calculate vendor balance: ${error.message}`);
  if (!data?.[0]) throw new AppError("Vendor balance is unavailable");
  return data[0];
}
