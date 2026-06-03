"use server";

import { depositService } from "./deposit.service";
import { AppError } from "@/lib/errors";
import type { DepositFormData } from "./deposit.types";
import {
  depositCreateSchema,
  depositCancelSchema,
  depositDeleteSchema,
} from "./deposit.schema";

export async function createDeposit(formData: DepositFormData) {
  const parsed = depositCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await depositService.create(parsed.data);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to create deposit" };
  }
}

export async function cancelDeposit(id: string, reason: string) {
  const parsed = depositCancelSchema.safeParse({ id, reason });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await depositService.cancel(parsed.data.id, parsed.data.reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel deposit" };
  }
}

export async function deleteDeposit(id: string) {
  const parsed = depositDeleteSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    await depositService.delete(parsed.data.id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to delete deposit" };
  }
}
