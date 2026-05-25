"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cancelDeposit } from "@/modules/deposit/deposit.actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface DepositDetail {
  id: string;
  doc_number: string;
  deposit_date: string;
  supplier_code: string;
  supplier_id: string;
  amount: number;
  vat_amount: number;
  vat_percent: number;
  po_number: string | null;
  remark: string | null;
  pay_code: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vendors: {
    code: string;
    name_en: string;
    name_th: string | null;
    tax_id: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "badge badge-warning" },
  active: { label: "Active", className: "badge badge-success" },
  applied: { label: "Applied", className: "badge badge-info" },
  cancelled: { label: "Cancelled", className: "badge badge-danger" },
};

export default function DepositDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [deposit, setDeposit] = useState<DepositDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchDeposit() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("deposit_payments")
        .select(
          "id, doc_number, deposit_date, supplier_code, supplier_id, amount, vat_amount, vat_percent, po_number, remark, pay_code, cheque_number, cheque_date, status, created_by, created_at, updated_at, vendors!supplier_id(code, name_en, name_th, tax_id)"
        )
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("Deposit not found");
        setLoading(false);
        return;
      }

      const vendorData = data.vendors as unknown as DepositDetail["vendors"];

      setDeposit({
        ...(data as Omit<typeof data, "vendors">),
        amount: Number(data.amount) || 0,
        vat_amount: Number(data.vat_amount) || 0,
        vat_percent: Number(data.vat_percent) || 0,
        vendors: vendorData,
      });
      setLoading(false);
    }
    fetchDeposit();
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const result = await cancelDeposit(id, "Cancelled by user");
      if (!result.success) {
        setError(result.error ?? "Failed to cancel deposit");
        return;
      }
      setCancelDialogOpen(false);
      router.refresh();
      setDeposit((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !deposit) {
    return (
      <div className="space-y-6">
        <Link href="/deposits" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Deposits
        </Link>
        <div className="card p-6 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!deposit) return null;

  const statusInfo = statusConfig[deposit.status] ?? {
    label: deposit.status,
    className: "badge badge-warning",
  };
  const canCancel = deposit.status === "draft" || deposit.status === "active";
  const vendor = deposit.vendors;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/deposits" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Deposit {deposit.doc_number}
            </h1>
            <p className="text-muted-foreground">
              Deposit payment details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={statusInfo.className}>{statusInfo.label}</span>
          {canCancel && (
            <button
              type="button"
              className="btn-destructive inline-flex items-center gap-2"
              onClick={() => setCancelDialogOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              Cancel Deposit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Deposit Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="label-text">Doc Number</p>
            <p className="font-medium">{deposit.doc_number}</p>
          </div>
          <div>
            <p className="label-text">Deposit Date</p>
            <p className="font-medium">{formatDate(deposit.deposit_date)}</p>
          </div>
          <div>
            <p className="label-text">Vendor</p>
            <p className="font-medium">
              {vendor
                ? `${vendor.code} - ${vendor.name_th || vendor.name_en}`
                : deposit.supplier_code}
            </p>
          </div>
          <div>
            <p className="label-text">Amount</p>
            <p className="font-mono font-medium">
              {formatCurrency(deposit.amount)}
            </p>
          </div>
          <div>
            <p className="label-text">VAT Amount</p>
            <p className="font-mono font-medium">
              {formatCurrency(deposit.vat_amount)}
            </p>
          </div>
          <div>
            <p className="label-text">VAT Percent</p>
            <p className="font-medium">{deposit.vat_percent}%</p>
          </div>
          <div>
            <p className="label-text">PO Number</p>
            <p className="font-medium">{deposit.po_number ?? "-"}</p>
          </div>
          <div>
            <p className="label-text">Payment Code</p>
            <p className="font-medium">{deposit.pay_code ?? "-"}</p>
          </div>
          <div>
            <p className="label-text">Status</p>
            <span className={statusInfo.className}>{statusInfo.label}</span>
          </div>
        </div>
      </div>

      {(deposit.cheque_number || deposit.cheque_date) && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Cheque Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="label-text">Cheque Number</p>
              <p className="font-medium">{deposit.cheque_number ?? "-"}</p>
            </div>
            <div>
              <p className="label-text">Cheque Date</p>
              <p className="font-medium">
                {deposit.cheque_date ? formatDate(deposit.cheque_date) : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {deposit.remark && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Remark</h2>
          <p className="whitespace-pre-wrap">{deposit.remark}</p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Audit Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="label-text">Created At</p>
            <p className="font-medium">{formatDate(deposit.created_at, "dd/MM/yyyy HH:mm")}</p>
          </div>
          <div>
            <p className="label-text">Updated At</p>
            <p className="font-medium">{formatDate(deposit.updated_at, "dd/MM/yyyy HH:mm")}</p>
          </div>
        </div>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Deposit</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel deposit{" "}
              <strong>{deposit.doc_number}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              No, Keep It
            </button>
            <button
              type="button"
              className="btn-destructive inline-flex items-center gap-2"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Yes, Cancel Deposit
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}