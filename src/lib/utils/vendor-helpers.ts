import type { createServerClient } from "@/lib/supabase/server";

export async function recalcVendorBalance(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  supplierCode: string
): Promise<void> {
  const { error } = await supabase.rpc("recalculate_vendor_balance", {
    p_vendor_code: supplierCode,
  });
  if (error) {
    console.error("Failed to recalculate vendor balance:", error.message);
  }
}
