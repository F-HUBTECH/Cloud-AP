import type { ApprovalStatus } from "@/lib/constants";

export interface Approval {
  id: string;
  entityType: "invoice";
  entityId: string;
  action: "submit" | "approve" | "reject";
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  entityType: "invoice";
  minApprovalLevel: number;
  requireSequentialApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalFormData {
  entityType: "invoice";
  entityId: string;
  remarks?: string;
}

export interface ApprovalActionData {
  approvalId: string;
  remarks?: string;
  rejectionReason?: string;
}

export interface ApprovalWithDetails extends Approval {
  entity: {
    documentNumber: string;
    supplierCode: string;
    supplierName: string;
    amount: number;
    description: string | null;
  };
  requester: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PendingApprovalItem {
  id: string;
  entityType: "invoice";
  entityId: string;
  documentNumber: string;
  supplierName: string;
  amount: number;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
}

export interface ApprovalListParams {
  page?: number;
  pageSize?: number;
  entityType?: "invoice";
  status?: ApprovalStatus;
  requestedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApprovalListResult {
  data: Approval[];
  total: number;
  page: number;
  pageSize: number;
}
