import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelDebitNoteButton } from "./cancel-button";

export const revalidate = 0;

interface DebitNoteDetail {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  supplier_name: string;
  inv_number: string | null;
  inv_date: string | null;
  vat_type: string;
  total_amount: number;
  total_no_vat: number;
  total_vat: number;
  total_wht: number;
  balance: number;
  status: string;
  remark: string | null;
  wht_code: string | null;
  po_number: string | null;
  due_date: string | null;
  due_days: number | null;
  receive_voucher: string | null;
  vat_number: string | null;
  period_year: number | null;
  period_month: number | null;
  created_at: string;
  updated_at: string;
}

interface DebitNoteItem {
  id: string;
  line_no: number;
  gl_account: string | null;
  description: string | null;
  dr_amount: number;
  cr_amount: number;
}

const statusColorMap: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  posted: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

const vatTypeLabels: Record<string, string> = {
  inclusive: "VAT Inclusive",
  exclusive: "VAT Exclusive",
  exempt: "VAT Exempt",
  none: "No VAT",
};

export default async function DebitNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("ap_type_code", "DR")
    .single();

  if (!invoice) notFound();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("code, name_en, name_th, tax_id")
    .eq("id", invoice.supplier_id)
    .single();

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("line_no");

  const dn: DebitNoteDetail = {
    id: invoice.id,
    doc_number: invoice.doc_number,
    doc_date: invoice.doc_date,
    supplier_code: invoice.supplier_code,
    supplier_id: invoice.supplier_id,
    supplier_name: vendor
      ? (vendor.name_th || vendor.name_en)
      : invoice.supplier_code,
    inv_number: invoice.inv_number,
    inv_date: invoice.inv_date,
    vat_type: invoice.vat_type,
    total_amount: Number(invoice.total_amount) || 0,
    total_no_vat: Number(invoice.total_no_vat) || 0,
    total_vat: Number(invoice.total_vat) || 0,
    total_wht: Number(invoice.total_wht) || 0,
    balance: Number(invoice.balance) || 0,
    status: invoice.status,
    remark: invoice.remark,
    wht_code: invoice.wht_code,
    po_number: invoice.po_number,
    due_date: invoice.due_date,
    due_days: invoice.due_days,
    receive_voucher: invoice.receive_voucher,
    vat_number: invoice.vat_number,
    period_year: invoice.period_year,
    period_month: invoice.period_month,
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
  };

  const lineItems: DebitNoteItem[] = (items ?? []).map(
    (item: Record<string, unknown>) => ({
      id: String(item.id ?? ""),
      line_no: Number(item.line_no) ?? 0,
      gl_account: item.gl_account ? String(item.gl_account) : null,
      description: item.description ? String(item.description) : null,
      dr_amount: Number(item.dr_amount) || 0,
      cr_amount: Number(item.cr_amount) || 0,
    })
  );

  const canCancel = dn.status === "draft" || dn.status === "pending_approval";
  const totalDr = lineItems.reduce((s, i) => s + i.dr_amount, 0);
  const totalCr = lineItems.reduce((s, i) => s + i.cr_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/debit-notes" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Debit Note {dn.doc_number}
            </h1>
            <p className="text-muted-foreground">Debit note detail view</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "badge",
              statusColorMap[dn.status] ?? "badge-info"
            )}
          >
            {dn.status.replace(/_/g, " ")}
          </span>
          <button
            type="button"
            className="btn-outline"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Debit Note Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="label-text text-muted-foreground">Doc Number</span>
            <p className="mt-1 font-medium">{dn.doc_number}</p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Date</span>
            <p className="mt-1 font-medium">{formatDate(dn.doc_date)}</p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Vendor</span>
            <p className="mt-1 font-medium">
              {dn.supplier_code} - {dn.supplier_name}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Invoice No.</span>
            <p className="mt-1 font-medium">{dn.inv_number ?? "-"}</p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">VAT Type</span>
            <p className="mt-1 font-medium">
              {vatTypeLabels[dn.vat_type] ?? dn.vat_type}
            </p>
          </div>
          {dn.wht_code && (
            <div>
              <span className="label-text text-muted-foreground">WHT Code</span>
              <p className="mt-1 font-medium">{dn.wht_code}</p>
            </div>
          )}
          {dn.due_date && (
            <div>
              <span className="label-text text-muted-foreground">Due Date</span>
              <p className="mt-1 font-medium">{formatDate(dn.due_date)}</p>
            </div>
          )}
          {dn.po_number && (
            <div>
              <span className="label-text text-muted-foreground">PO Number</span>
              <p className="mt-1 font-medium">{dn.po_number}</p>
            </div>
          )}
          {dn.receive_voucher && (
            <div>
              <span className="label-text text-muted-foreground">Receive Voucher</span>
              <p className="mt-1 font-medium">{dn.receive_voucher}</p>
            </div>
          )}
          {dn.vat_number && (
            <div>
              <span className="label-text text-muted-foreground">VAT Number</span>
              <p className="mt-1 font-medium">{dn.vat_number}</p>
            </div>
          )}
          {dn.remark && (
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="label-text text-muted-foreground">Remark</span>
              <p className="mt-1">{dn.remark}</p>
            </div>
          )}
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="card">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Account</th>
                  <th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="text-center text-muted-foreground">
                      {item.line_no}
                    </td>
                    <td>{item.gl_account ?? "-"}</td>
                    <td className="text-muted-foreground">
                      {item.description ?? "-"}
                    </td>
                    <td className="text-right font-mono">
                      {item.dr_amount ? formatCurrency(item.dr_amount) : "-"}
                    </td>
                    <td className="text-right font-mono">
                      {item.cr_amount ? formatCurrency(item.cr_amount) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td colSpan={3} className="text-right">
                    Total
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(totalDr)}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(totalCr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="label-text text-muted-foreground">Total (excl. VAT)</span>
            <p className="mt-1 font-mono text-lg font-medium">
              {formatCurrency(dn.total_no_vat)}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">VAT</span>
            <p className="mt-1 font-mono text-lg font-medium">
              {formatCurrency(dn.total_vat)}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">WHT</span>
            <p className="mt-1 font-mono text-lg font-medium">
              {formatCurrency(dn.total_wht)}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Total Amount</span>
            <p className="mt-1 font-mono text-lg font-medium">
              {formatCurrency(dn.total_amount)}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Balance</span>
            <p className="mt-1 font-mono text-lg font-medium">
              {formatCurrency(dn.balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Audit Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label-text text-muted-foreground">Created</span>
            <p className="mt-1 text-sm">
              {formatDate(dn.created_at, "dd/MM/yyyy HH:mm")}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Last Updated</span>
            <p className="mt-1 text-sm">
              {formatDate(dn.updated_at, "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>
      </div>

      {canCancel && (
        <CancelDebitNoteButton id={dn.id} docNumber={dn.doc_number} />
      )}
    </div>
  );
}