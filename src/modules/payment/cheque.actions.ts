"use server";

import { z } from "zod";
import { AppError } from "@/lib/errors";
import { loadChequePrintData } from "./cheque.service";
import { chequePrintIssues } from "./cheque";

export async function prepareChequePrint(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { success: false as const, error: "Payment ไม่ถูกต้อง" };
  try {
    const data = await loadChequePrintData(id);
    const issues = chequePrintIssues(data);
    if (issues.length) return { success: false as const, error: issues.join(" · ") };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: error instanceof AppError ? error.message : "ไม่สามารถเตรียมเช็คได้ กรุณาลองใหม่" };
  }
}
