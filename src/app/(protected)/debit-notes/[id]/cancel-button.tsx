"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelDebitNote } from "@/modules/debit-note/debit-note.actions";
import { Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CancelDebitNoteButtonProps {
  id: string;
  docNumber: string;
}

export function CancelDebitNoteButton({ id, docNumber }: CancelDebitNoteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setIsCancelling(true);

    try {
      const result = await cancelDebitNote(id, "Cancelled by user");
      if (!result.success) {
        setError(result.error ?? "An unexpected error occurred");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-destructive">Cancel Debit Note</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This action cannot be undone. The debit note will be marked as cancelled.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild className="btn-destructive">
            <button type="button" className="btn-destructive">
              <XCircle className="h-4 w-4" />
              Cancel Debit Note
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Debit Note</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel debit note{" "}
                <span className="font-semibold">{docNumber}</span>? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <DialogFooter>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setOpen(false)}
                disabled={isCancelling}
              >
                No, keep it
              </button>
              <button
                type="button"
                className="btn-destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Yes, cancel it"
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}