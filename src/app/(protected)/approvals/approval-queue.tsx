"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { approveEntity, rejectEntity } from "@/modules/approval/approval.actions";
import type { PendingApprovalItem } from "@/modules/approval/approval.types";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Decision = "approve" | "reject";

export function ApprovalQueue({ initialItems }: { initialItems: PendingApprovalItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<PendingApprovalItem | null>(null);
  const [decision, setDecision] = useState<Decision>("approve");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDecision(item: PendingApprovalItem, nextDecision: Decision) {
    setSelected(item);
    setDecision(nextDecision);
    setComment("");
    setError(null);
  }

  async function decide() {
    if (!selected) return;
    if (decision === "reject" && !comment.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setSaving(true);
    setError(null);
    const result = decision === "approve"
      ? await approveEntity({ approvalId: selected.id, remarks: comment || undefined })
      : await rejectEntity({ approvalId: selected.id, rejectionReason: comment });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? `Failed to ${decision} invoice`);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== selected.id));
    setSelected(null);
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="card py-16 text-center text-muted-foreground">No pending approvals</div>;
  }

  return (
    <>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Vendor</th>
              <th>Requested By</th>
              <th>Requested At</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><Link href={`/postings/${item.entityId}`} className="font-medium text-primary hover:underline">{item.documentNumber}</Link></td>
                <td>{item.supplierName || "-"}</td>
                <td>{item.requestedBy}</td>
                <td>{formatDate(item.requestedAt)}</td>
                <td className="text-right tabular-nums">{formatCurrency(item.amount)}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-primary" onClick={() => openDecision(item, "approve")}>
                      <CheckCircle className="h-4 w-4" />Approve
                    </button>
                    <button type="button" className="btn-destructive" onClick={() => openDecision(item, "reject")}>
                      <XCircle className="h-4 w-4" />Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === "approve" ? "Approve Invoice" : "Reject Invoice"}</DialogTitle>
            <DialogDescription>
              {selected?.documentNumber} · {selected?.supplierName || "Unknown vendor"}
            </DialogDescription>
          </DialogHeader>
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <label htmlFor="decision-comment" className="label-text">
              {decision === "reject" ? "Rejection reason *" : "Comment (optional)"}
            </label>
            <textarea
              id="decision-comment"
              className="input-field min-h-[80px]"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <button type="button" className="btn-outline" onClick={() => setSelected(null)} disabled={saving}>Cancel</button>
            <button type="button" className={decision === "approve" ? "btn-primary" : "btn-destructive"} onClick={decide} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : decision === "approve" ? "Approve" : "Reject"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
