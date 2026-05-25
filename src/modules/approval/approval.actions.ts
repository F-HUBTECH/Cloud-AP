"use server";

import { approvalService } from "./approval.service";
import { AppError } from "@/lib/errors";
import type { ApprovalFormData, ApprovalActionData, ApprovalListParams } from "./approval.types";

export async function requestApproval(formData: ApprovalFormData) {
  try {
    const result = await approvalService.requestApproval(formData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to request approval" };
  }
}

export async function approveEntity(actionData: ApprovalActionData) {
  try {
    const result = await approvalService.approve(actionData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to approve" };
  }
}

export async function rejectEntity(actionData: ApprovalActionData) {
  try {
    const result = await approvalService.reject(actionData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to reject" };
  }
}

export async function getPendingApprovals(params?: ApprovalListParams) {
  try {
    const result = await approvalService.getPendingForUser(params);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch pending approvals" };
  }
}

export async function getApprovalHistory(params?: ApprovalListParams) {
  try {
    const result = await approvalService.getApprovalHistory(params);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch approval history" };
  }
}