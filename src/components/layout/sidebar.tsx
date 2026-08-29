"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/hooks/use-permission";
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
  adminOnly?: boolean;
  financeOnly?: boolean;
  approverOnly?: boolean;
}

const ALL_NAV_ITEMS: NavItem[] = [
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
    label: "Approvals",
    href: "/approvals",
    icon: ClipboardCheck,
    moduleCode: MODULE_CODES.APPROVAL,
    approverOnly: true,
  },
  {
    label: "Transfers",
    href: "/transfers",
    icon: ArrowRightLeft,
    financeOnly: true,
  },
  {
    label: "Bank Recon",
    href: "/bank-reconciliation",
    icon: Landmark,
    financeOnly: true,
  },
  {
    label: "Deposit Apply",
    href: "/deposit-applications",
    icon: Banknote,
    financeOnly: true,
  },
  {
    label: "Check Account",
    href: "/check-account",
    icon: ClipboardCheck,
    financeOnly: true,
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
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { roles, isLoading: rolesLoading } = usePermission();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = useMemo(
    () => roles.includes("ADMIN") || roles.includes("SUPERADMIN"),
    [roles]
  );
  const isFinance = useMemo(() => roles.includes("FINANCE") || isAdmin, [roles, isAdmin]);
  const isApprover = useMemo(
    () => roles.includes("APPROVER") || roles.includes("AP_MANAGER") || isAdmin,
    [roles, isAdmin]
  );

  const navItems = useMemo(() => {
    if (rolesLoading) return ALL_NAV_ITEMS; // show all while loading to avoid layout shift
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.financeOnly && !isFinance) return false;
      if (item.approverOnly && !isApprover) return false;
      return true;
    });
  }, [rolesLoading, isAdmin, isFinance, isApprover]);

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
