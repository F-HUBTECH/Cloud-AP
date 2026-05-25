"use server";

import { debitNoteService } from "./debit-note.service";
import { AppError } from "@/lib/errors";
import type { DebitNoteFormData } from "./debit-note.types";

export async function createDebitNote(formData: DebitNoteFormData) {
  try {
    const result = await debitNoteService.create(formData);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to create debit note" };
  }
}

export async function cancelDebitNote(id: string, reason: string) {
  try {
    const result = await debitNoteService.cancel(id, reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel debit note" };
  }
}

export async function deleteDebitNote(id: string) {
  try {
    await debitNoteService.delete(id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to delete debit note" };
  }
}
