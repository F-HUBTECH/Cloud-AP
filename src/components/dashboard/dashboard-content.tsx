"use client";

import Link from "next/link";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { formatCurrency } from "@/lib/utils/format";
import { calculateDashboardStats, type DashboardStats, type DashboardInvoice, type DashboardPayment, type DashboardVendor } from "@/lib/dashboard/metrics";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileText, Landmark, Plus, ShieldCheck, Users, Wallet } from "lucide-react";

interface DashboardContentProps {
  initialStats: DashboardStats;
  currentMonth: string;
  today: string;
  initialError?: boolean;
}

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-4";
const panel = "rounded-2xl border border-slate-200 bg-white shadow-sm";

export function DashboardContent({ initialStats, currentMonth, today, initialError = false }: DashboardContentProps) {
  const invoices = useRealtimeSubscription<DashboardInvoice>("invoices");
  const payments = useRealtimeSubscription<DashboardPayment>("payments");
  const vendors = useRealtimeSubscription<DashboardVendor>("vendors");
  const ready = !invoices.isLoading && !payments.isLoading && !vendors.isLoading;
  const fetchError = Boolean(invoices.error || payments.error || vendors.error);
  const stats = ready && !fetchError
    ? calculateDashboardStats(vendors.data, invoices.data, payments.data, today)
    : initialStats;
  const hasError = fetchError || (initialError && !ready);
  const overduePercent = stats.totalPayable > 0 ? stats.overdueAmount / stats.totalPayable * 100 : 0;
  const undatedPercent = stats.totalPayable > 0 ? stats.undatedAmount / stats.totalPayable * 100 : 0;
  const currentAmount = Math.max(0, stats.totalPayable - stats.overdueAmount - stats.undatedAmount);
  const invoiceCount = stats.draftInvoices + stats.pendingInvoices + stats.approvedInvoices;
  const stages = [
    { label: "Draft", description: "Complete and submit", count: stats.draftInvoices, color: "bg-slate-400", href: "/postings?status=draft" },
    { label: "Pending approval", description: "Awaiting a decision", count: stats.pendingInvoices, color: "bg-amber-400", href: "/postings?status=pending_approval" },
    { label: "Approved / posted", description: "Authorized invoices", count: stats.approvedInvoices, color: "bg-teal-600", href: "/postings" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-1 text-slate-900 sm:p-3 lg:p-5">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700"><Landmark className="h-4 w-4" aria-hidden="true" /> Finance workspace</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Accounts payable overview</h1>
          <p className="mt-2 text-sm text-slate-500">A clear view of your obligations, payments and priorities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600"><CalendarDays className="h-4 w-4" aria-hidden="true" />{currentMonth}</span>
          <Link href="/postings/new" className={`inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 ${focus}`}><Plus className="h-4 w-4" aria-hidden="true" /> New voucher</Link>
        </div>
      </header>

      {hasError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some financial data could not be loaded. Figures may be incomplete. Refresh the page to try again.</div>}

      <section aria-label="Key financial metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/postings" className={`relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-sm transition-colors hover:bg-slate-800 ${focus}`}>
          <div className="flex items-center justify-between"><span className="text-sm text-slate-300">Total outstanding</span><Wallet className="h-5 w-5 text-teal-300" aria-hidden="true" /></div>
          <p className="mt-6 break-words text-[clamp(1.4rem,2.2vw,2.25rem)] font-semibold tracking-tight tabular-nums">{formatCurrency(stats.totalPayable)}</p>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-300"><span>THB · Approved & posted</span><ArrowUpRight className="h-4 w-4 text-teal-300" aria-hidden="true" /></div>
        </Link>
        {[
          { label: "Paid this month", value: formatCurrency(stats.paidThisMonth), note: `${stats.paymentsThisMonth} completed payments · THB`, icon: ArrowDownLeft, color: "bg-teal-50 text-teal-700", href: "/payments" },
          { label: "Overdue balance", value: formatCurrency(stats.overdueAmount), note: `${overduePercent.toFixed(1)}% of outstanding · THB`, icon: AlertTriangle, color: "bg-rose-50 text-rose-700", href: "/reports/aging" },
          { label: "Pending approval", value: stats.pendingInvoices.toLocaleString(), note: "Invoices awaiting review", icon: Clock3, color: "bg-amber-50 text-amber-700", href: "/postings?status=pending_approval" },
        ].map(({ label, value, note, icon: Icon, color, href }) => (
          <Link key={label} href={href} className={`${panel} group p-6 transition-colors hover:border-teal-400 ${focus}`}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm text-slate-500">{label}</span><span className={`rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div>
            <p className="mt-4 break-words text-[clamp(1.4rem,2.2vw,2.25rem)] font-semibold tracking-tight tabular-nums">{value}</p>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><span>{note}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700" aria-hidden="true" /></div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className={`${panel} p-5 sm:p-6`} aria-labelledby="payables-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="payables-title" className="text-base font-semibold">Payables composition</h2><p className="mt-1 text-xs text-slate-500">Outstanding balance by payment timing</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-500">THB</span></div>
          <div className="mt-7 flex flex-col items-center gap-8 sm:flex-row sm:justify-around">
            <div role="img" aria-label={`Overdue ${overduePercent.toFixed(1)} percent of total outstanding`} className="relative flex h-48 w-48 shrink-0 items-center justify-center rounded-full" style={{ background: stats.totalPayable ? `conic-gradient(#e66b76 0% ${overduePercent}%, #cbd5e1 ${overduePercent}% ${overduePercent + undatedPercent}%, #0d9488 ${overduePercent + undatedPercent}% 100%)` : "#e2e8f0" }}>
              <div className="flex h-[154px] w-[154px] flex-col items-center justify-center rounded-full bg-white"><span className="text-[11px] text-slate-500">Overdue share</span><span className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{overduePercent.toFixed(1)}<span className="text-lg text-slate-400">%</span></span><span className="mt-1 text-[11px] text-slate-500">{stats.totalPayable ? "of outstanding" : "No outstanding balance"}</span></div>
            </div>
            <div className="w-full space-y-5 sm:max-w-xs">
              {[
                { label: "Current / not yet due", amount: currentAmount, color: "bg-teal-600" },
                { label: "Past due", amount: stats.overdueAmount, color: "bg-[#e66b76]" },
                { label: "No due date", amount: stats.undatedAmount, color: "bg-slate-300" },
              ].map((item) => <div key={item.label} className="flex items-center gap-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`} /><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 break-words text-lg font-semibold tabular-nums">{formatCurrency(item.amount)}</p></div></div>)}
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">Based on approved and posted invoices</span><Link href="/reports/aging" className={`inline-flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-900 ${focus}`}>View aging report <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
        </section>

        <section className={`${panel} p-5 sm:p-6`} aria-labelledby="workflow-title">
          <div className="flex items-start justify-between"><div><h2 id="workflow-title" className="text-base font-semibold">Invoice workflow</h2><p className="mt-1 text-xs text-slate-500">From preparation to approval</p></div><FileText className="h-5 w-5 text-slate-400" aria-hidden="true" /></div>
          <div className="mt-6 flex items-baseline gap-2"><span className="text-3xl font-semibold tabular-nums">{invoiceCount.toLocaleString()}</span><span className="text-xs text-slate-500">invoices in workflow</span></div>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">{stages.map((stage) => <div key={stage.label} className={stage.color} style={{ width: `${invoiceCount ? stage.count / invoiceCount * 100 : 0}%` }} />)}</div>
          <div className="mt-5 divide-y divide-slate-100">{stages.map((stage) => <Link key={stage.label} href={stage.href} className={`group flex items-center gap-3 rounded-md py-3.5 ${focus}`}><span className={`h-2 w-2 shrink-0 rounded-full ${stage.color}`} /><div className="flex-1"><p className="text-sm font-medium group-hover:text-teal-700">{stage.label}</p><p className="mt-0.5 text-xs text-slate-500">{stage.description}</p></div><span className="text-lg font-semibold tabular-nums">{stage.count.toLocaleString()}</span><ArrowUpRight className="ml-2 h-4 w-4 text-slate-400" aria-hidden="true" /></Link>)}</div>
        </section>
      </div>

      <section className={`${panel} overflow-hidden`} aria-labelledby="priorities-title">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span><h2 id="priorities-title" className="text-base font-semibold">Your next priorities</h2></div>
        <div className="grid divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {[
            { title: stats.overdueAmount > 0 ? "Review overdue balances" : "No overdue balances", description: stats.overdueAmount > 0 ? "Review aging and plan your next payment run." : "Continue monitoring upcoming payment obligations.", href: "/reports/aging", label: "Review aging", icon: AlertTriangle },
            { title: stats.pendingInvoices > 0 ? `${stats.pendingInvoices} invoices need review` : "Approval queue is clear", description: "Keep the approval process moving with timely reviews.", href: "/postings?status=pending_approval", label: "View pending invoices", icon: CheckCircle2 },
            { title: `${stats.activeVendors} active vendors`, description: `${stats.totalVendors} vendors in your directory. Keep payment details up to date.`, href: "/vendors", label: "Manage vendors", icon: Users },
          ].map(({ title, description, href, label, icon: Icon }) => <div key={label} className="flex flex-col items-start p-5 sm:p-6"><Icon className="mb-3 h-5 w-5 text-slate-400" aria-hidden="true" /><h3 className="text-sm font-semibold">{title}</h3><p className="mb-5 mt-2 text-xs leading-relaxed text-slate-500">{description}</p><Link href={href} className={`mt-auto inline-flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-900 ${focus}`}>{label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>)}
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[11px] text-slate-500"><span>Accounts payable · All amounts in Thai Baht (THB)</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />As of {today} · Bangkok time</span></footer>
    </div>
  );
}
