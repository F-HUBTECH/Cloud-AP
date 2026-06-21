"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  CircleCheck,
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

interface DashboardContentProps {
  initialStats: DashboardStats;
  currentMonth: string;
}

export function DashboardContent({
  initialStats,
  currentMonth,
}: DashboardContentProps) {
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
    const vendorData = vendors.length > 0 ? vendors : null;
    const invoiceData = invoices.length > 0 ? invoices : null;
    const paymentData = payments.length > 0 ? payments : null;

    const totalVendors = vendorData
      ? vendorData.length
      : initialStats.totalVendors;
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
    const currentMonthStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthPayments = paymentData
      ? paymentData.filter((p) => {
          if (!p.doc_date) return false;
          return String(p.doc_date).substring(0, 7) === currentMonthStr;
        })
      : [];

    const paymentsThisMonth = paymentData
      ? monthPayments.length
      : initialStats.paymentsThisMonth;
    const paidThisMonth = paymentData
      ? monthPayments.reduce(
          (sum, p) => sum + (Number(p.total_amount) || 0),
          0
        )
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

  const hasPending = stats.pendingInvoices > 0;
  const hasOverdue = stats.overdueAmount > 0;

  return (
    <div className="space-y-10">
      {/* ============================================
          Section 1 — Needs Attention
          ============================================ */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
          Needs Attention
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pending Invoices */}
          <Link
            href="/postings?status=pending_approval"
            className={cn(
              "group relative rounded-lg border bg-card p-5 transition-colors",
              "hover:border-primary/30 hover:bg-primary/[0.02]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Pending Invoices
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-2 text-3xl font-bold tracking-tight tabular-nums",
                    hasPending ? "text-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {stats.pendingInvoices}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasPending
                    ? "Awaiting review or approval"
                    : "Nothing pending — all clear"}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
            </div>
          </Link>

          {/* Overdue Amount */}
          <Link
            href="/postings?overdue=true"
            className={cn(
              "group relative rounded-lg border bg-card p-5 transition-colors",
              hasOverdue
                ? "border-destructive/20 hover:border-destructive/40 hover:bg-destructive/[0.02]"
                : "hover:border-primary/30 hover:bg-primary/[0.02]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 shrink-0",
                      hasOverdue ? "text-destructive" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm text-muted-foreground">
                    Overdue Amount
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-2 text-3xl font-bold tracking-tight tabular-nums",
                    hasOverdue
                      ? "text-destructive"
                      : "text-muted-foreground/60"
                  )}
                >
                  {formatCurrency(stats.overdueAmount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasOverdue
                    ? "Invoices past due — review now"
                    : "No overdue invoices"}
                </p>
              </div>
              <ArrowRight
                className={cn(
                  "mt-1 h-4 w-4 shrink-0 transition-colors",
                  hasOverdue
                    ? "text-destructive/50 group-hover:text-destructive"
                    : "text-muted-foreground/40 group-hover:text-primary"
                )}
              />
            </div>
          </Link>
        </div>
      </section>

      {/* ============================================
          Section 2 — Financial Overview
          ============================================ */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
          Financial Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Payable */}
          <Link
            href="/postings"
            className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Total Payable
              </span>
            </div>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {formatCurrency(stats.totalPayable)}
            </p>
          </Link>

          {/* Paid This Month */}
          <Link
            href="/payments"
            className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Paid This Month
              </span>
            </div>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {formatCurrency(stats.paidThisMonth)}
            </p>
          </Link>

          {/* Approved Invoices */}
          <Link
            href="/postings?status=approved"
            className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Approved</span>
            </div>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {stats.approvedInvoices}
            </p>
          </Link>
        </div>
      </section>

      {/* ============================================
          Status footer
          ============================================ */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <CircleCheck className="h-3.5 w-3.5 shrink-0" />
        <span>
          {stats.activeVendors} of {stats.totalVendors} vendors active
        </span>
        <span className="mx-1.5 text-border">·</span>
        <span>
          {stats.paymentsThisMonth} payment
          {stats.paymentsThisMonth !== 1 ? "s" : ""} processed in{" "}
          {currentMonth}
        </span>
      </div>
    </div>
  );
}
