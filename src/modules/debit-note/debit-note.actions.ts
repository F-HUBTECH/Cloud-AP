"use server";

import { debitNoteService } from "./debit-note.service";
import { AppError } from "@/lib/errors";
import type { DebitNoteFormData } from "./debit-note.types";
import {
  debitNoteCreateSchema,
  debitNoteCancelSchema,
  debitNoteDeleteSchema,
} from "./debit-note.schema";

export async function createDebitNote(formData: DebitNoteFormData) {
  const parsed = debitNoteCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await debitNoteService.create(parsed.data);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to create debit note" };
  }
}

export async function cancelDebitNote(id: string, reason: string) {
  const parsed = debitNoteCancelSchema.safeParse({ id, reason });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await debitNoteService.cancel(parsed.data.id, parsed.data.reason);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to cancel debit note" };
  }
}

export async function deleteDebitNote(id: string) {
  const parsed = debitNoteDeleteSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }

  try {
    await debitNoteService.delete(parsed.data.id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    return { success: false as const, error: "Failed to delete debit note" };
  }
}
