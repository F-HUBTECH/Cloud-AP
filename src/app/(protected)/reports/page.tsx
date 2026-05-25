import Link from "next/link";
import {
  BookOpen,
  Users,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
} from "lucide-react";

const reports = [
  {
    title: "AP Aging Report",
    description: "Analyze vendor balances by aging buckets (current, 30, 60, 90, 120+ days)",
    href: "/reports/aging",
    icon: TrendingUp,
  },
  {
    title: "Vendor Card",
    description: "View all transactions for a specific vendor within a period",
    href: "/reports/vendor-card",
    icon: Users,
  },
  {
    title: "Detail Ledger",
    description: "View all transactions affecting a specific GL account within a period",
    href: "/reports/detail-ledger",
    icon: BookOpen,
  },
  {
    title: "Payment Register",
    description: "Summary of all payments made within a date range",
    href: "/reports/payment-register",
    icon: DollarSign,
  },
  {
    title: "Invoice Register",
    description: "Summary of all invoices posted within a date range",
    href: "/reports/invoice-register",
    icon: FileText,
  },
  {
    title: "Vendor Balance Summary",
    description: "Compare vendor balances across periods",
    href: "/reports/vendor-balance",
    icon: Building2,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and view AP reports
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="card p-6 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}