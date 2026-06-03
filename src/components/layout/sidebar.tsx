"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { APP_NAME, MODULE_CODES } from "@/lib/constants";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRightLeft,
  Landmark,
  ClipboardCheck,
  Banknote,
  Receipt,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  moduleCode?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Vendors",
    href: "/vendors",
    icon: Users,
    moduleCode: MODULE_CODES.SUPPLIER,
  },
  {
    label: "AP Vouchers",
    href: "/postings",
    icon: FileText,
    moduleCode: MODULE_CODES.VOUCHER_AP,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    moduleCode: MODULE_CODES.VOUCHER_PAYMENT,
  },
  {
    label: "Transfers",
    href: "/transfers",
    icon: ArrowRightLeft,
  },
  {
    label: "Bank Recon",
    href: "/bank-reconciliation",
    icon: Landmark,
  },
  {
    label: "Deposit Apply",
    href: "/deposit-applications",
    icon: Banknote,
  },
  {
    label: "Check Account",
    href: "/check-account",
    icon: ClipboardCheck,
  },
  {
    label: "WHT Report",
    href: "/witholding-tax",
    icon: Receipt,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BookOpen,
    moduleCode: MODULE_CODES.REPORT,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    moduleCode: MODULE_CODES.CONFIG,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar-background transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="text-sm font-bold">K</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              {APP_NAME}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", isActive && "active")}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-link w-full justify-center"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}