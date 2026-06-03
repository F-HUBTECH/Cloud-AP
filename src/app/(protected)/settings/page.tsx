"use client";

import Link from "next/link";
import {
  Building2,
  FileText,
  Coins,
  Receipt,
  CreditCard,
  Calendar,
  Users,
  Hash,
  BarChart3,
} from "lucide-react";

const settingsGroups = [
  {
    title: "Company",
    items: [
      { label: "Company Info", href: "/settings/company", icon: Building2, description: "Company details, address, and defaults" },
      { label: "Document Numbers", href: "/settings/doc-number", icon: Hash, description: "Auto-numbering format for each document type" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { label: "Chart of Accounts", href: "/settings/gl-accounts", icon: BarChart3, description: "GL account codes and hierarchy" },
      { label: "AP Types", href: "/settings/ap-types", icon: FileText, description: "Document types (AP, DR, CR, DP, ADJ, TRN)" },
      { label: "VAT Rates", href: "/settings/vat-rates", icon: Coins, description: "Value Added Tax codes and rates" },
      { label: "WHT Rates", href: "/settings/wht-rates", icon: Receipt, description: "Withholding Tax codes and rates" },
      { label: "Payment Codes", href: "/settings/payment-codes", icon: CreditCard, description: "Payment method codes (Cash, Cheque, Transfer, etc.)" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Periods", href: "/settings/period", icon: Calendar, description: "Accounting period management and closing" },
      { label: "Users", href: "/settings/users", icon: Users, description: "User management and access control" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration and master data</p>
      </div>

      {settingsGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{item.label}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}