"use server";

import { approvalService } from "./approval.service";
import { AppError } from "@/lib/errors";
import type { ApprovalFormData, ApprovalActionData, ApprovalListParams } from "./approval.types";
import {
  approvalFormDataSchema,
  approvalActionDataSchema,
  approvalListParamsSchema,
} from "./approval.schema";

export async function requestApproval(formData: ApprovalFormData) {
  const parsed = approvalFormDataSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await approvalService.requestApproval(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to request approval" };
  }
}

export async function approveEntity(actionData: ApprovalActionData) {
  const parsed = approvalActionDataSchema.safeParse(actionData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await approvalService.approve(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to approve" };
  }
}

export async function rejectEntity(actionData: ApprovalActionData) {
  const parsed = approvalActionDataSchema.safeParse(actionData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await approvalService.reject(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to reject" };
  }
}

export async function getPendingApprovals(params?: ApprovalListParams) {
  const parsed = approvalListParamsSchema.safeParse(params ?? {});
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await approvalService.getPendingForUser(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch pending approvals" };
  }
}

export async function getApprovalHistory(params?: ApprovalListParams) {
  const parsed = approvalListParamsSchema.safeParse(params ?? {});
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await approvalService.getApprovalHistory(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch approval history" };
  }
}
