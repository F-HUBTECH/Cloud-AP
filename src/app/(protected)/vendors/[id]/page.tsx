import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Building2,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface VendorPageProps {
  params: Promise<{ id: string }>;
}

async function getVendor(id: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

async function getVendorInvoices(id: string) {
  const supabase = await createServerClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("code")
    .eq("id", id)
    .single();

  if (!vendor) return [];

  const { data } = await supabase
    .from("invoices")
    .select("id, doc_number, doc_date, total_amount, balance, status")
    .eq("supplier_id", id)
    .order("doc_date", { ascending: false })
    .limit(10);

  return data ?? [];
}

export default async function VendorDetailPage({ params }: VendorPageProps) {
  const { id } = await params;
  const vendor = await getVendor(id);

  if (!vendor) {
    notFound();
  }

  const invoices = await getVendorInvoices(id);
  const balance = (Number(vendor.total_amount) || 0) - (Number(vendor.total_payment) || 0);
  const paidRatio =
    Number(vendor.total_amount) > 0
      ? (Number(vendor.total_payment) || 0) / Number(vendor.total_amount)
      : 0;

  const vendorTypeLabel: Record<string, string> = {
    N: "Normal",
    G: "Government",
    E: "Employee",
    O: "Other",
  };

  const whtCardLabel: Record<string, string> = {
    company: "Company",
    person: "Person",
    government: "Government",
    non_profit: "Non-Profit",
    foreign: "Foreign",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/vendors" className="btn-ghost mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {vendor.name_en}
              </h1>
              <span
                className={cn(
                  "badge",
                  vendor.is_active ? "badge-success" : "badge-danger"
                )}
              >
                {vendor.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {vendor.code}
              {vendor.name_th && vendor.name_th !== vendor.name_en && (
                <span> · {vendor.name_th}</span>
              )}
            </p>
          </div>
        </div>
        <Link
          href={`/vendors/${vendor.id}/edit`}
          className="btn-outline"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="card p-6 lg:col-span-2 space-y-6">
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <Building2 className="h-4 w-4" />
              General Information
            </h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <InfoItem label="Vendor Code" value={vendor.code} />
              <InfoItem label="Vendor Type" value={vendorTypeLabel[vendor.vendor_type] ?? vendor.vendor_type} />
              <InfoItem label="Tax ID" value={vendor.tax_id} />
              <InfoItem label="Card ID" value={vendor.card_id} />
              <InfoItem label="WHT Card Type" value={whtCardLabel[vendor.wht_card_type] ?? vendor.wht_card_type} />
              <InfoItem label="Credit Term" value={`${vendor.credit_term ?? 0} days`} />
            </dl>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              Contact &amp; Address
            </h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <InfoItem
                label="Address"
                value={[vendor.address_line1, vendor.address_line2, vendor.address_line3]
                  .filter(Boolean)
                  .join(", ")}
                span
              />
              <InfoItem label="City" value={vendor.city} />
              <InfoItem label="Country" value={vendor.country} />
              <InfoItem label="Zip Code" value={vendor.zip_code} />
              <InfoItem
                label="Telephone"
                value={vendor.tel}
                icon={Phone}
              />
              <InfoItem label="Fax" value={vendor.fax} />
              <InfoItem
                label="Email"
                value={vendor.email}
                icon={Mail}
              />
              <InfoItem
                label="Attention"
                value={vendor.attn}
                icon={UserCheck}
              />
            </dl>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <Landmark className="h-4 w-4" />
              Tax &amp; Payment
            </h2>
            <dl className="grid gap-2 sm:grid-cols-3">
              <InfoItem
                label="VAT Rate"
                value={`${vendor.tax_percent ?? 0}%`}
              />
              <InfoItem
                label="WHT Rate"
                value={`${vendor.wht_percent ?? 0}%`}
              />
              <InfoItem
                label="WHT Card Type"
                value={whtCardLabel[vendor.wht_card_type] ?? vendor.wht_card_type}
              />
            </dl>
          </section>

          {vendor.remark && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                Remarks
              </h2>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                {vendor.remark}
              </p>
            </section>
          )}
        </div>

        {/* Balance Sidebar */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Balance Summary
          </h2>

          <div>
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(Number(vendor.total_amount) || 0)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatCurrency(Number(vendor.total_payment) || 0)}
            </p>
          </div>

          {/* Paid progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Paid</span>
              <span>{Math.round(paidRatio * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.round(paidRatio * 100))}%` }}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
            <p
              className={cn(
                "text-xl font-bold tabular-nums",
                balance > 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {formatCurrency(balance)}
            </p>
          </div>

          {Number(vendor.deposit_balance) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Deposit Balance</p>
              <p className="text-lg font-semibold tabular-nums text-success">
                {formatCurrency(Number(vendor.deposit_balance))}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link
            href={`/postings?vendorId=${vendor.id}`}
            className="btn-outline text-sm"
          >
            <FileText className="h-4 w-4" />
            View All
          </Link>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doc Number</th>
                <th>Date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center"
                  >
                    <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No invoices yet
                    </p>
                    <Link
                      href={`/postings/new?vendorId=${vendor.id}`}
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      Create first invoice
                    </Link>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link
                        href={`/postings/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.doc_number}
                      </Link>
                    </td>
                    <td>{formatDate(inv.doc_date)}</td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(Number(inv.total_amount) || 0)}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(Number(inv.balance) || 0)}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "badge",
                          inv.status === "posted" || inv.status === "approved"
                            ? "badge-success"
                            : inv.status === "draft"
                              ? "badge-info"
                              : inv.status === "cancelled" ||
                                  inv.status === "voided"
                                ? "badge-danger"
                                : "badge-warning"
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  span,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  span?: boolean;
  icon?: React.ElementType;
}) {
  const display = value != null && value !== "" ? String(value) : "—";
  return (
    <div className={cn(span && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5 text-sm font-medium">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {display}
      </dd>
    </div>
  );
}
