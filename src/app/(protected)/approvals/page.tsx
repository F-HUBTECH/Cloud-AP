import { getPendingApprovals } from "@/modules/approval/approval.actions";
import { ApprovalQueue } from "./approval-queue";

export default async function ApprovalsPage() {
  const result = await getPendingApprovals({ entityType: "invoice" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Approvals</h1>
        <p className="text-muted-foreground">Review invoices submitted by other users</p>
      </div>
      {!result.success ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {result.error}
        </div>
      ) : (
        <ApprovalQueue initialItems={result.data ?? []} />
      )}
    </div>
  );
}
