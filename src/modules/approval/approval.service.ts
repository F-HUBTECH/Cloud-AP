import { createServerClient } from "@/lib/supabase/server";
import { NotFoundError, AppError } from "@/lib/errors";
import { APPROVAL_STATUS, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ApprovalStatus } from "@/lib/constants";
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
    const { data: approvalId, error } = await supabase.rpc("request_invoice_approval", {
      p_invoice_id: formData.entityId,
      p_comment: formData.remarks || null,
    });
    if (error || !approvalId) throw new AppError(error?.message ?? "Failed to request approval");

    const { data: approval, error: fetchError } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", approvalId)
      .single();
    if (fetchError || !approval) throw new AppError(fetchError?.message ?? "Approval not found");
    return this.mapApproval(approval);
  }

  async approve(actionData: ApprovalActionData): Promise<Approval> {
    const supabase = await this.getClient();
    const { error } = await supabase.rpc("decide_invoice_approval", {
      p_approval_id: actionData.approvalId,
      p_decision: "approve",
      p_comment: actionData.remarks || null,
    });
    if (error) throw new AppError(error.message);
    return this.getById(actionData.approvalId);
  }

  async reject(actionData: ApprovalActionData): Promise<Approval> {
    if (!actionData.rejectionReason?.trim()) {
      throw new AppError("Rejection reason is required", "REJECTION_REASON_REQUIRED", 400);
    }
    const supabase = await this.getClient();
    const { error } = await supabase.rpc("decide_invoice_approval", {
      p_approval_id: actionData.approvalId,
      p_decision: "reject",
      p_comment: actionData.rejectionReason,
    });
    if (error) throw new AppError(error.message);
    return this.getById(actionData.approvalId);
  }

  async getPendingForUser(params: ApprovalListParams = {}): Promise<PendingApprovalItem[]> {
    const supabase = await this.getClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];
    const { data: appUser } = await supabase
      .from("app_users")
      .select("id")
      .eq("auth_uid", authUser.id)
      .maybeSingle();
    if (!appUser) return [];

    let query = supabase
      .from("approvals")
      .select("*")
      .eq("status", APPROVAL_STATUS.PENDING)
      .order("requested_at", { ascending: true });

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", appUser.id);
    const roleIds = (roleRows ?? []).map((row) => row.role_id);
    const { data: adminRoles } = roleIds.length
      ? await supabase.from("roles").select("code").in("id", roleIds)
      : { data: [] };
    const isAdmin = (adminRoles ?? []).some((role) => role.code === "ADMIN" || role.code === "SUPERADMIN");
    if (!isAdmin) query = query.neq("requested_by", appUser.id);

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

  private async getById(id: string): Promise<Approval> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from("approvals").select("*").eq("id", id).single();
    if (error || !data) throw new NotFoundError("Approval", id);
    return this.mapApproval(data);
  }

  private async getEntityInfo(
    entityType: string,
    entityId: string,
  ): Promise<{ documentNumber: string; supplierName: string; amount: number } | null> {
    const supabase = await this.getClient();

    if (entityType === "invoice") {
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
      entityType: "invoice",
      entityId: row.entity_id as string,
      action: row.action as "submit" | "approve" | "reject",
      requestedBy: row.requested_by as string,
      requestedAt: row.requested_at as string,
      status: row.status as ApprovalStatus,
      approvedBy: (row.approved_by as string) ?? null,
      approvedAt: (row.approved_at as string) ?? null,
      rejectedBy: row.status === APPROVAL_STATUS.REJECTED ? (row.approved_by as string) ?? null : null,
      rejectedAt: row.status === APPROVAL_STATUS.REJECTED ? (row.approved_at as string) ?? null : null,
      rejectionReason: row.status === APPROVAL_STATUS.REJECTED ? (row.comment as string) ?? null : null,
      remarks: (row.comment as string) ?? null,
      createdAt: (row.created_at as string) ?? row.requested_at as string,
      updatedAt: (row.approved_at as string) ?? row.requested_at as string,
    };
  }
}

export const approvalService = new ApprovalService();
