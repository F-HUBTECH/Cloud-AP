"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cancelPayment, payPayment, approvePayment } from "@/modules/payment/payment.actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, Printer, CheckCircle, Banknote, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PaymentDetail {
  id: string;
  doc_number: string;
  doc_date: string;
  supplier_code: string;
  supplier_id: string;
  pay_method: string;
  cheque_number: string | null;
  total_amount: number;
  total_net: number;
  status: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentItem {
  id: string;
  line_no: number;
  gl_account: string | null;
  description: string | null;
  dr_amount: number;
  cr_amount: number;
}

interface PaymentInvoice {
  id: string;
  invoice_id: string;
  voucher_number: string | null;
  amount_paid: number;
  wht_amount: number;
}

const statusColorMap: Record<string, string> = {
  draft: "badge-info",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  paid: "badge-success",
  cancelled: "badge-danger",
  voided: "badge-danger",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  offset: "Offset",
  deposit: "Deposit",
};

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [paymentInvoices, setPaymentInvoices] = useState<PaymentInvoice[]>([]);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchPayment = useCallback(async () => {
    if (!id) return;
    const supabase = createClient();

    const { data: p } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (p) {
      setPayment({
        ...p,
        total_amount: Number(p.total_amount) || 0,
        total_net: Number(p.total_net) || 0,
      });
    }

    const { data: items } = await supabase
      .from("payment_items")
      .select("*")
      .eq("payment_id", id)
      .order("line_no");

    setPaymentItems(
      (items ?? []).map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        line_no: Number(item.line_no) ?? 0,
        gl_account: item.gl_account ? String(item.gl_account) : null,
        description: item.description ? String(item.description) : null,
        dr_amount: Number(item.dr_amount) || 0,
        cr_amount: Number(item.cr_amount) || 0,
      }))
    );

    const { data: invoices } = await supabase
      .from("payment_invoices")
      .select("*")
      .eq("payment_id", id);

    setPaymentInvoices(
      (invoices ?? []).map((inv: Record<string, unknown>) => ({
        id: String(inv.id ?? ""),
        invoice_id: String(inv.invoice_id ?? ""),
        voucher_number: inv.voucher_number ? String(inv.voucher_number) : null,
        amount_paid: Number(inv.amount_paid) || 0,
        wht_amount: Number(inv.wht_amount) || 0,
      }))
    );

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const refreshData = useCallback(() => {
    fetchPayment();
  }, [fetchPayment]);

  async function handleApprove() {
    if (!payment) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await approvePayment(payment.id);
      if (!result.success) {
        setError(result.error ?? "Failed to approve payment");
        return;
      }
      setApproveDialogOpen(false);
      refreshData();
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkAsPaid() {
    if (!payment) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await payPayment(payment.id, new Date().toISOString().slice(0, 10));
      if (!result.success) {
        setError(result.error ?? "Failed to mark as paid");
        return;
      }
      setPayDialogOpen(false);
      refreshData();
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    if (!payment) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await cancelPayment(payment.id, cancelReason || "Cancelled by user");
      if (!result.success) {
        setError(result.error ?? "Failed to cancel payment");
        return;
      }
      setCancelDialogOpen(false);
      setCancelReason("");
      refreshData();
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/payments" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Payment not found</h1>
        </div>
      </div>
    );
  }

  const showApprove = payment.status === "draft";
  const showMarkAsPaid = payment.status === "approved";
  const showCancel = payment.status !== "cancelled" && payment.status !== "voided";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/payments" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Payment {payment.doc_number}
            </h1>
            <p className="text-muted-foreground">Payment detail view</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "badge",
              statusColorMap[payment.status] ?? "badge-info"
            )}
          >
            {payment.status.replace(/_/g, " ")}
          </span>
          {showApprove && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setApproveDialogOpen(true)}
            >
              <CheckCircle className="h-4 w-4" />
              Approve Payment
            </button>
          )}
          {showMarkAsPaid && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setPayDialogOpen(true)}
            >
              <Banknote className="h-4 w-4" />
              Mark as Paid
            </button>
          )}
          {showCancel && (
            <button
              type="button"
              className="btn-destructive"
              onClick={() => setCancelDialogOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              Cancel Payment
            </button>
          )}
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

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve payment {payment.doc_number}? This will change the status to &quot;approved&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isSaving}
            >
              No, go back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleApprove}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Yes, approve"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Confirmation Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark payment {payment.doc_number} as paid? This action records the payment as completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPayDialogOpen(false)}
              disabled={isSaving}
            >
              No, go back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleMarkAsPaid}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, mark as paid"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Payment Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) setCancelReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel payment {payment.doc_number}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label htmlFor="cancel-reason" className="label-text">
              Cancel Reason (optional)
            </label>
            <textarea
              id="cancel-reason"
              className="input-field mt-1 min-h-[80px]"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
              disabled={isSaving}
            >
              No, go back
            </button>
            <button
              type="button"
              className="btn-destructive"
              onClick={handleCancel}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, cancel payment"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Payment Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="label-text text-muted-foreground">Doc Number</span>
            <p className="mt-1 font-medium">{payment.doc_number}</p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Date</span>
            <p className="mt-1 font-medium">{formatDate(payment.doc_date)}</p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Supplier</span>
            <p className="mt-1 font-medium">{payment.supplier_code}</p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Payment Method</span>
            <p className="mt-1 font-medium">
              {methodLabels[payment.pay_method] ?? payment.pay_method}
            </p>
          </div>
          {payment.cheque_number && (
            <div>
              <span className="label-text text-muted-foreground">Cheque Number</span>
              <p className="mt-1 font-medium">{payment.cheque_number}</p>
            </div>
          )}
          <div>
            <span className="label-text text-muted-foreground">Total Amount</span>
            <p className="mt-1 font-mono font-medium">
              {formatCurrency(payment.total_amount)}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Net Amount</span>
            <p className="mt-1 font-mono font-medium">
              {formatCurrency(payment.total_net)}
            </p>
          </div>
          {payment.remark && (
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="label-text text-muted-foreground">Remark</span>
              <p className="mt-1">{payment.remark}</p>
            </div>
          )}
        </div>
      </div>

      {paymentItems.length > 0 && (
        <div className="card">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Payment Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>GL Account</th>
                  <th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {paymentItems.map((item) => (
                  <tr key={item.id}>
                    <td className="text-center text-muted-foreground">
                      {item.line_no}
                    </td>
                    <td className="font-mono">{item.gl_account ?? "-"}</td>
                    <td className="text-muted-foreground">
                      {item.description ?? "-"}
                    </td>
                    <td className="text-right font-mono">
                      {formatCurrency(item.dr_amount)}
                    </td>
                    <td className="text-right font-mono">
                      {formatCurrency(item.cr_amount)}
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
                    {formatCurrency(
                      paymentItems.reduce((s, i) => s + i.dr_amount, 0)
                    )}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(
                      paymentItems.reduce((s, i) => s + i.cr_amount, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {paymentInvoices.length > 0 && (
        <div className="card">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Applied Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Voucher</th>
                  <th className="text-right">Amount Paid</th>
                  <th className="text-right">WHT</th>
                </tr>
              </thead>
              <tbody>
                {paymentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link
                        href={`/postings/${inv.invoice_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoice_id}
                      </Link>
                    </td>
                    <td className="text-muted-foreground">
                      {inv.voucher_number ?? "-"}
                    </td>
                    <td className="text-right font-mono">
                      {formatCurrency(inv.amount_paid)}
                    </td>
                    <td className="text-right font-mono">
                      {formatCurrency(inv.wht_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td colSpan={2} className="text-right">
                    Total
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(
                      paymentInvoices.reduce((s, i) => s + i.amount_paid, 0)
                    )}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(
                      paymentInvoices.reduce((s, i) => s + i.wht_amount, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Audit Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label-text text-muted-foreground">Created</span>
            <p className="mt-1 text-sm">
              {formatDate(payment.created_at, "dd/MM/yyyy HH:mm")}
            </p>
          </div>
          <div>
            <span className="label-text text-muted-foreground">Last Updated</span>
            <p className="mt-1 text-sm">
              {formatDate(payment.updated_at, "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}