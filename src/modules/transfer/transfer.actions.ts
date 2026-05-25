"use server";

import { transferService } from "./transfer.service";
import { transferCreateSchema } from "./transfer.schema";
import { AppError } from "@/lib/errors";

export async function listTransfers(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    return await transferService.list(params);
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to list transfers" };
  }
}

export async function getTransfer(id: string) {
  try {
    return await transferService.getById(id);
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to get transfer" };
  }
}

export async function createTransfer(formData: unknown) {
  try {
    const validated = transferCreateSchema.parse(formData);
    const result = await transferService.create(validated);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    if (error && typeof error === "object" && "issues" in error) {
      return { success: false as const, error: "Validation failed" };
    }
    return { success: false as const, error: "Failed to create transfer" };
  }
}

export async function cancelTransfer(id: string) {
  try {
    const result = await transferService.cancel(id);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel transfer" };
  }
}

export async function deleteTransfer(id: string) {
  try {
    await transferService.delete(id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to delete transfer" };
  }
}