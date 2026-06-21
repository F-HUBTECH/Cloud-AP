import { createServerClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const revalidate = 60;

interface DashboardStats {
  totalVendors: number;
  activeVendors: number;
  pendingInvoices: number;
  approvedInvoices: number;
  totalPayable: number;
  overdueAmount: number;
  paymentsThisMonth: number;
  paidThisMonth: number;
}

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createServerClient();

  const [vendorsResult, invoicesResult, paymentsResult] = await Promise.all([
    supabase.from("vendors").select("id, is_active", { count: "exact" }),
    supabase
      .from("invoices")
      .select("id, status, total_amount, balance")
      .in("status", ["draft", "pending_approval", "approved", "posted"]),
    supabase
      .from("payments")
      .select("id, status, total_amount, doc_date")
      .in("status", ["draft", "approved", "paid"]),
  ]);

  const vendors = vendorsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.is_active).length;
  const pendingInvoices = invoices.filter(
    (i) => i.status === "draft" || i.status === "pending_approval"
  ).length;
  const approvedInvoices = invoices.filter(
    (i) => i.status === "approved" || i.status === "posted"
  ).length;
  const totalPayable = invoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const overdueInvoices = invoices.filter((i) => {
    const balance = Number(i.balance) || 0;
    return balance > 0;
  });
  const overdueAmount = overdueInvoices.reduce(
    (sum, i) => sum + (Number(i.balance) || 0),
    0
  );

  const monthPayments = payments.filter((p) => {
    if (!p.doc_date) return false;
    const paymentMonth = String(p.doc_date).substring(0, 7);
    return paymentMonth === currentMonth;
  });
  const paymentsThisMonth = monthPayments.length;
  const paidThisMonth = monthPayments.reduce(
    (sum, p) => sum + (Number(p.total_amount) || 0),
    0
  );

  return {
    totalVendors,
    activeVendors,
    pendingInvoices,
    approvedInvoices,
    totalPayable,
    overdueAmount,
    paymentsThisMonth,
    paidThisMonth,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const now = new Date();
  const currentMonth = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{currentMonth}</p>
      </div>

      <DashboardContent initialStats={stats} currentMonth={currentMonth} />
    </div>
  );
}