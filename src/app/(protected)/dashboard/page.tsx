import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
} from "lucide-react";

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

  const statCards = [
    {
      label: "Active Vendors",
      value: `${stats.activeVendors} / ${stats.totalVendors}`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending Invoices",
      value: stats.pendingInvoices.toString(),
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Approved Invoices",
      value: stats.approvedInvoices.toString(),
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Payable",
      value: formatCurrency(stats.totalPayable),
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Overdue Amount",
      value: formatCurrency(stats.overdueAmount),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Payments This Month",
      value: stats.paymentsThisMonth.toString(),
      icon: CreditCard,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Paid This Month",
      value: formatCurrency(stats.paidThisMonth),
      icon: stats.paidThisMonth > 0 ? TrendingUp : TrendingDown,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Accounts Payable overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-6">
              <div className="flex items-center gap-4">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.bg)}>
                  <Icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}