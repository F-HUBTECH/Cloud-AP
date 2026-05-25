"use server";

import { periodService } from "./period.service";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const closeMonthSchema = z.object({
  periodId: z.string().uuid(),
});

const closeYearSchema = z.object({
  year: z.string(),
});

const reopenSchema = z.object({
  periodId: z.string().uuid(),
});

export async function closeMonth(input: unknown) {
  try {
    const { periodId } = closeMonthSchema.parse(input);
    const result = await periodService.closeMonth(periodId);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    if (error instanceof z.ZodError) return { success: false as const, error: "Invalid input" };
    return { success: false as const, error: "Failed to close month" };
  }
}

export async function closeYear(input: unknown) {
  try {
    const { year } = closeYearSchema.parse(input);
    const result = await periodService.closeYear(year);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    if (error instanceof z.ZodError) return { success: false as const, error: "Invalid input" };
    return { success: false as const, error: "Failed to close year" };
  }
}

export async function reopenPeriod(input: unknown) {
  try {
    const { periodId } = reopenSchema.parse(input);
    const result = await periodService.reopenPeriod(periodId);
    return { success: true as const, data: result };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    if (error instanceof z.ZodError) return { success: false as const, error: "Invalid input" };
    return { success: false as const, error: "Failed to reopen period" };
  }
}