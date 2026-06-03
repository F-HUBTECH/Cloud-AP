import type { createServerClient } from "@/lib/supabase/server";

export async function getGLTradeAccount(
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<string> {
  const { data: tradeAccount } = await supabase
    .from("config")
    .select("acc_trade")
    .single();
  return (tradeAccount as Record<string, unknown>)?.acc_trade as string ?? "2000";
}
