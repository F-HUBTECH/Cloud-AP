"use server";

import { bankReconService } from "./bank.service";
import { AppError } from "@/lib/errors";
import type { BankReconciliationFormData } from "./bank.types";
import {
  bankReconciliationCreateSchema,
  bankReconciliationCancelSchema,
  bankReconciliationReconcileSchema,
} from "./bank.schema";

export async function createBankReconciliation(formData: BankReconciliationFormData) {
  const parsed = bankReconciliationCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await bankReconService.create(parsed.data);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to create bank reconciliation" };
  }
}

export async function reconcileCheque(id: string) {
  const parsed = bankReconciliationReconcileSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await bankReconService.reconcileCheque(parsed.data.id);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to reconcile" };
  }
}

export async function cancelBankReconciliation(id: string, reason: string) {
  const parsed = bankReconciliationCancelSchema.safeParse({ id, reason });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await bankReconService.cancel(parsed.data.id, parsed.data.reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel bank reconciliation" };
  }
}
