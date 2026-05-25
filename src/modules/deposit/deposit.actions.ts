"use server";

import { depositService } from "./deposit.service";
import { AppError } from "@/lib/errors";
import type { DepositFormData } from "./deposit.types";

export async function createDeposit(formData: DepositFormData) {
  try {
    const result = await depositService.create(formData);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to create deposit" };
  }
}

export async function cancelDeposit(id: string, reason: string) {
  try {
    const result = await depositService.cancel(id, reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel deposit" };
  }
}

export async function deleteDeposit(id: string) {
  try {
    await depositService.delete(id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to delete deposit" };
  }
}
