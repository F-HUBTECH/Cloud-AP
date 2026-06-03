import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AuthorizationError, AppError } from "@/lib/errors";
import { APPROVAL_STATUS, MODULE_CODES, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ApprovalStatus } from "@/lib/constants";
import { canApprove } from "@/lib/utils/permissions";
import type {
  Approval,
  ApprovalFormData,
  ApprovalActionData,
  PendingApprovalItem,
  ApprovalListParams,
  ApprovalListResult,
} from "./approval.types";

class ApprovalService {
  private async getClient() {
    return createServerClient();
  }

  async requestApproval(formData: ApprovalFormData): Promise<Approval> {
    const supabase = await this.getClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new AuthorizationError("You must be logged in to request approval");

    const { data: existingPending } = await supabase
      .from("approvals")
      .select("id")
      .eq("entity_type", formData.entityType)
      .eq("entity_id", formData.entityId)
      .eq("status", APPROVAL_STATUS.PENDING)
      .maybeSingle();

    if (existingPending) {
      throw new AppError("An approval request is already pending for this entity", "APPROVAL_ALREADY_PENDING", 409);
    }

    const { data: approval, error } = await supabase
      .from("approvals")
      .insert({
        entity_type: formData.entityType,
        entity_id: formData.entityId,
        requested_by: authUser.id,
        requested_at: new Date().toISOString(),
        status: APPROVAL_STATUS.PENDING,
        remarks: formData.remarks || null,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message);

    await this.updateEntityStatus(formData.entityType, formData.entityId, "pending_approval");

    return this.mapApproval(approval);
  }

  async approve(actionData: ApprovalActionData): Promise<Approval> {
    if (!(await canApprove(MODULE_CODES.VOUCHER_AP))) {
      throw new AuthorizationError("You are not authorized to approve");
    }

    const supabase = await this.getClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new AuthorizationError("You must be logged in to approve");

    const { data: approval, error: fetchError } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", actionData.approvalId)
      .single();

    if (fetchError || !approval) {
      throw new NotFoundError("Approval", actionData.approvalId);
    }

    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new AppError("Only pending approvals can be approved", "APPROVAL_NOT_PENDING", 422);
    }

    const { data: updated, error: updateError } = await supabase
      .from("approvals")
      .update({
        status: APPROVAL_STATUS.APPROVED,
        approved_by: authUser.id,
        approved_at: new Date().toISOString(),
        remarks: actionData.remarks || approval.remarks,
      })
      .eq("id", actionData.approvalId)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    await this.updateEntityStatus(approval.entity_type, approval.entity_id, "approved");

    return this.mapApproval(updated);
  }

  async reject(actionData: ApprovalActionData): Promise<Approval> {
    if (!(await canApprove(MODULE_CODES.VOUCHER_AP))) {
      throw new AuthorizationError("You are not authorized to reject");
    }

    const supabase = await this.getClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new AuthorizationError("You must be logged in to reject");

    const { data: approval, error: fetchError } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", actionData.approvalId)
      .single();

    if (fetchError || !approval) {
      throw new NotFoundError("Approval", actionData.approvalId);
    }

    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new AppError("Only pending approvals can be rejected", "APPROVAL_NOT_PENDING", 422);
    }

    if (!actionData.rejectionReason) {
      throw new AppError("Rejection reason is required", "REJECTION_REASON_REQUIRED", 400);
    }

    const { data: updated, error: updateError } = await supabase
      .from("approvals")
      .update({
        status: APPROVAL_STATUS.REJECTED,
        rejected_by: authUser.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: actionData.rejectionReason,
        remarks: actionData.remarks || approval.remarks,
      })
      .eq("id", actionData.approvalId)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message);

    await this.updateEntityStatus(approval.entity_type, approval.entity_id, "rejected");

    return this.mapApproval(updated);
  }

  async getPendingForUser(params: ApprovalListParams = {}): Promise<PendingApprovalItem[]> {
    const supabase = await this.getClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];

    let query = supabase
      .from("approvals")
      .select("*")
      .eq("status", APPROVAL_STATUS.PENDING)
      .neq("requested_by", authUser.id)
      .order("requested_at", { ascending: true });

    if (params.entityType) {
      query = query.eq("entity_type", params.entityType);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message);

    const result: PendingApprovalItem[] = [];

    for (const approval of data ?? []) {
      const entityInfo = await this.getEntityInfo(approval.entity_type, approval.entity_id);
      const { data: requester } = await supabase
        .from("app_users")
        .select("id, login_name, display_name")
        .eq("id", approval.requested_by)
        .maybeSingle();

      result.push({
        id: approval.id,
        entityType: approval.entity_type,
        entityId: approval.entity_id,
        documentNumber: entityInfo?.documentNumber ?? "",
        supplierName: entityInfo?.supplierName ?? "",
        amount: entityInfo?.amount ?? 0,
        requestedBy: requester?.display_name ?? approval.requested_by,
        requestedAt: approval.requested_at,
        status: approval.status,
      });
    }

    return result;
  }

  async getApprovalHistory(params: ApprovalListParams = {}): Promise<ApprovalListResult> {
    const supabase = await this.getClient();
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      entityType,
      status,
      requestedBy,
      dateFrom,
      dateTo,
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("approvals")
      .select("*", { count: "exact" })
      .order("requested_at", { ascending: false })
      .range(from, to);

    if (entityType) query = query.eq("entity_type", entityType);
    if (status) query = query.eq("status", status);
    if (requestedBy) query = query.eq("requested_by", requestedBy);
    if (dateFrom) query = query.gte("requested_at", dateFrom);
    if (dateTo) query = query.lte("requested_at", dateTo);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message);

    return {
      data: (data ?? []).map(this.mapApproval),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  private async updateEntityStatus(
    entityType: string,
    entityId: string,
    status: string,
  ): Promise<void> {
    const supabase = await this.getClient();

    const tableMap: Record<string, string> = {
      voucher: "invoices",
      payment: "payments",
      debit_note: "invoices",
      credit_note: "invoices",
    };

    const table = tableMap[entityType];
    if (!table) return;

    await supabase
      .from(table)
      .update({ status })
      .eq("id", entityId);
  }

  private async getEntityInfo(
    entityType: string,
    entityId: string,
  ): Promise<{ documentNumber: string; supplierName: string; amount: number } | null> {
    const supabase = await this.getClient();

    if (entityType === "voucher" || entityType === "debit_note" || entityType === "credit_note") {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("doc_number, supplier_code, total_amount")
        .eq("id", entityId)
        .maybeSingle();

      if (!invoice) return null;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("name_en")
        .eq("code", invoice.supplier_code)
        .maybeSingle();

      return {
        documentNumber: invoice.doc_number,
        supplierName: vendor?.name_en ?? "",
        amount: invoice.total_amount,
      };
    }

    if (entityType === "payment") {
      const { data: payment } = await supabase
        .from("payments")
        .select("doc_number, supplier_code, total_amount")
        .eq("id", entityId)
        .maybeSingle();

      if (!payment) return null;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("name_en")
        .eq("code", payment.supplier_code)
        .maybeSingle();

      return {
        documentNumber: payment.doc_number,
        supplierName: vendor?.name_en ?? "",
        amount: payment.total_amount,
      };
    }

    return null;
  }

  private mapApproval(row: Record<string, unknown>): Approval {
    return {
      id: row.id as string,
      entityType: row.entity_type as "voucher" | "payment" | "debit_note" | "credit_note",
      entityId: row.entity_id as string,
      requestedBy: row.requested_by as string,
      requestedAt: row.requested_at as string,
      status: row.status as ApprovalStatus,
      approvedBy: (row.approved_by as string) ?? null,
      approvedAt: (row.approved_at as string) ?? null,
      rejectedBy: (row.rejected_by as string) ?? null,
      rejectedAt: (row.rejected_at as string) ?? null,
      rejectionReason: (row.rejection_reason as string) ?? null,
      remarks: (row.remarks as string) ?? null,
      createdAt: (row.created_at as string) ?? row.requested_at as string,
      updatedAt: (row.updated_at as string) ?? row.requested_at as string,
    };
  }
}

export const approvalService = new ApprovalService();