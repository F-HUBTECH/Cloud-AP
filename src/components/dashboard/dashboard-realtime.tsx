"use client";

import { useMemo } from "react";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
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

interface DashboardRealtimeProps {
  initialStats: DashboardStats;
}

export function DashboardRealtime({ initialStats }: DashboardRealtimeProps) {
  const { data: invoices } = useRealtimeSubscription<{
    id: string;
    status: string;
    total_amount: number;
    balance: number;
  }>("invoices");

  const { data: payments } = useRealtimeSubscription<{
    id: string;
    status: string;
    total_amount: number;
    doc_date: string;
  }>("payments");

  const { data: vendors } = useRealtimeSubscription<{
    id: string;
    is_active: boolean;
  }>("vendors");

  const stats = useMemo(() => {
    // Use realtime data when available, fall back to initial server data
    const vendorData = vendors.length > 0 ? vendors : null;
    const invoiceData = invoices.length > 0 ? invoices : null;
    const paymentData = payments.length > 0 ? payments : null;

    const totalVendors = vendorData ? vendorData.length : initialStats.totalVendors;
    const activeVendors = vendorData
      ? vendorData.filter((v) => v.is_active).length
      : initialStats.activeVendors;

    const pendingInvoices = invoiceData
      ? invoiceData.filter(
          (i) => i.status === "draft" || i.status === "pending_approval"
        ).length
      : initialStats.pendingInvoices;

    const approvedInvoices = invoiceData
      ? invoiceData.filter(
          (i) => i.status === "approved" || i.status === "posted"
        ).length
      : initialStats.approvedInvoices;

    const totalPayable = invoiceData
      ? invoiceData.reduce((sum, i) => sum + (Number(i.balance) || 0), 0)
      : initialStats.totalPayable;

    const overdueAmount = invoiceData
      ? invoiceData
          .filter((i) => (Number(i.balance) || 0) > 0)
          .reduce((sum, i) => sum + (Number(i.balance) || 0), 0)
      : initialStats.overdueAmount;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthPayments = paymentData
      ? paymentData.filter((p) => {
          if (!p.doc_date) return false;
          return String(p.doc_date).substring(0, 7) === currentMonth;
        })
      : [];

    const paymentsThisMonth = paymentData ? monthPayments.length : initialStats.paymentsThisMonth;
    const paidThisMonth = paymentData
      ? monthPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)
      : initialStats.paidThisMonth;

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
  }, [invoices, payments, vendors, initialStats]);

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
  );
}
