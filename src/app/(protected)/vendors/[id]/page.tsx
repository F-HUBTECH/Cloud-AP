import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, Edit2, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface VendorPageProps {
  params: Promise<{ id: string }>;
}

async function getVendor(id: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.from("vendors").select("*").eq("id", id).single();
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

  const infoItems = [
    { label: "Vendor Code", value: vendor.code },
    { label: "Name (EN)", value: vendor.name_en },
    { label: "Name (TH)", value: vendor.name_th ?? "-" },
    { label: "Tax ID", value: vendor.tax_id ?? "-" },
    { label: "Card ID", value: vendor.card_id ?? "-" },
    { label: "Vendor Type", value: vendor.vendor_type },
    { label: "Tel", value: vendor.tel ?? "-" },
    { label: "Fax", value: vendor.fax ?? "-" },
    { label: "Email", value: vendor.email ?? "-" },
    {
      label: "Address",
      value: [vendor.address_line1, vendor.address_line2, vendor.address_line3]
        .filter(Boolean)
        .join(", ") || "-",
    },
    { label: "Credit Term", value: `${vendor.credit_term ?? 0} days` },
    { label: "VAT Rate", value: `${vendor.tax_percent ?? 0}%` },
    { label: "WHT Rate", value: `${vendor.wht_percent ?? 0}%` },
    { label: "WHT Card Type", value: vendor.wht_card_type ?? "-" },
    { label: "Status", value: vendor.is_active ? "Active" : "Inactive" },
  ];

  const balanceItems = [
    {
      label: "Total Invoice Amount",
      value: formatCurrency(Number(vendor.total_amount) || 0),
    },
    {
      label: "Total Payment",
      value: formatCurrency(Number(vendor.total_payment) || 0),
    },
    {
      label: "Outstanding Balance",
      value: formatCurrency(
        (Number(vendor.total_amount) || 0) - (Number(vendor.total_payment) || 0)
      ),
    },
    {
      label: "Deposit Balance",
      value: formatCurrency(Number(vendor.deposit_balance) || 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vendors" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{vendor.name_en}</h1>
            <p className="text-muted-foreground">Vendor: {vendor.code}</p>
          </div>
          <span
            className={cn(
              "badge",
              vendor.is_active ? "badge-success" : "badge-danger"
            )}
          >
            {vendor.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Vendor Information</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {infoItems.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Balance Summary</h2>
          <dl className="grid gap-3">
            {balanceItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="font-mono font-semibold">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Recent Invoices</h2>
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
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.doc_number}</td>
                    <td>{formatDate(inv.doc_date)}</td>
                    <td className="text-right font-mono">
                      {formatCurrency(Number(inv.total_amount) || 0)}
                    </td>
                    <td className="text-right font-mono">
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
                              : inv.status === "cancelled" || inv.status === "voided"
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