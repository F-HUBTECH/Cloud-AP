"use server";

import { depositApplicationService } from "./deposit-application.service";
import { AppError } from "@/lib/errors";
import type { DepositApplicationFormData } from "./deposit-application.types";

export async function applyDeposit(formData: DepositApplicationFormData) {
  try {
    const result = await depositApplicationService.applyDeposit(formData);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to apply deposit" };
  }
}

export async function cancelDepositApplication(id: string, reason: string) {
  try {
    const result = await depositApplicationService.cancelApplication(id, reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel deposit application" };
  }
}
