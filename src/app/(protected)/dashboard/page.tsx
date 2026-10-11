import { createServerClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { calculateDashboardStats, getDashboardDate } from "@/lib/dashboard/metrics";

export const revalidate = 60;

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const [vendors, invoices, payments] = await Promise.all([
    supabase.from("vendors").select("id, is_active"),
    supabase.from("invoices").select("id, status, balance, due_date")
      .in("status", ["draft", "pending_approval", "approved", "posted"]),
    supabase.from("payments").select("id, status, total_amount, doc_date").eq("status", "paid"),
  ]);
  const today = getDashboardDate();
  const stats = calculateDashboardStats(vendors.data ?? [], invoices.data ?? [], payments.data ?? [], today);
  const currentMonth = new Date(`${today}T12:00:00+07:00`).toLocaleDateString("en-US", {
    timeZone: "Asia/Bangkok", month: "long", year: "numeric",
  });

  return <DashboardContent initialStats={stats} currentMonth={currentMonth} today={today}
    initialError={Boolean(vendors.error || invoices.error || payments.error)} />;
}
