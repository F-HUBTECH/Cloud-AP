"use server";

import { bankReconService } from "./bank.service";
import { AppError } from "@/lib/errors";
import type { BankReconciliationFormData } from "./bank.types";

export async function createBankReconciliation(formData: BankReconciliationFormData) {
  try {
    const result = await bankReconService.create(formData);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to create bank reconciliation" };
  }
}

export async function reconcileBank(id: string) {
  try {
    const result = await bankReconService.reconcileCheque(id);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to reconcile" };
  }
}

export async function cancelBankReconciliation(id: string, reason: string) {
  try {
    const result = await bankReconService.cancel(id, reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel bank reconciliation" };
  }
}
