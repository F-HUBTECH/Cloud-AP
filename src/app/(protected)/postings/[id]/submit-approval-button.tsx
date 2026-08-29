"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { requestApproval } from "@/modules/approval/approval.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function SubmitApprovalButton({
  invoiceId,
  onSubmitted,
}: {
  invoiceId: string;
  onSubmitted?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const result = await requestApproval({
      entityType: "invoice",
      entityId: invoiceId,
      remarks: comment || undefined,
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Failed to submit invoice");
      return;
    }

    setOpen(false);
    await onSubmitted?.();
    router.refresh();
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" />
        Submit for Approval
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Invoice for Approval</DialogTitle>
            <DialogDescription>
              The invoice will be locked for editing until an approver decides it.
            </DialogDescription>
          </DialogHeader>
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <label htmlFor="approval-comment" className="label-text">Comment (optional)</label>
            <textarea
              id="approval-comment"
              className="input-field min-h-[80px]"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : "Submit"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
