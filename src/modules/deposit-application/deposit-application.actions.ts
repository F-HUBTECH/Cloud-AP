"use server";

import { depositApplicationService } from "./deposit-application.service";
import { AppError } from "@/lib/errors";
import type { DepositApplicationFormData } from "./deposit-application.types";
import {
  depositApplicationCreateSchema,
  depositApplicationCancelSchema,
} from "./deposit-application.schema";

export async function applyDeposit(formData: DepositApplicationFormData) {
  const parsed = depositApplicationCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await depositApplicationService.applyDeposit(parsed.data);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to apply deposit" };
  }
}

export async function cancelDepositApplication(id: string, reason: string) {
  const parsed = depositApplicationCancelSchema.safeParse({ id, reason });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await depositApplicationService.cancelApplication(parsed.data.id, parsed.data.reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel deposit application" };
  }
}
