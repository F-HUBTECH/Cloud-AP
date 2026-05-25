import { createServerClient } from "@/lib/supabase/server";

export async function logAudit(params: {
  tableName: string;
  recordId: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "cancel" | "post" | "pay" | "apply";
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  detail?: string | null;
}): Promise<void> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      performed_by: user?.id ?? null,
      detail: params.detail ?? null,
    });
  } catch {
    // Audit logging should never block operations
  }
}
