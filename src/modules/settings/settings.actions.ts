"use server";

import { settingsService } from "./settings.service";
import {
  apTypeSchema,
  apTypeUpdateSchema,
  vatCodeSchema,
  vatCodeUpdateSchema,
  whtCodeSchema,
  whtCodeUpdateSchema,
  paymentCodeSchema,
  paymentCodeUpdateSchema,
  glAccountSchema,
  glAccountUpdateSchema,
  deleteSchema,
  configSchema,
} from "./settings.schema";

export async function createApType(input: unknown) {
  const parsed = apTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.createApType(parsed.data);
}

export async function updateApType(input: unknown) {
  const parsed = apTypeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  const { id, ...updateData } = parsed.data;
  return settingsService.updateApType(id, updateData);
}

export async function deleteApType(input: unknown) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.deleteApType(parsed.data.id);
}

export async function createVatCode(input: unknown) {
  const parsed = vatCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.createVatCode(parsed.data);
}

export async function updateVatCode(input: unknown) {
  const parsed = vatCodeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  const { id, ...updateData } = parsed.data;
  return settingsService.updateVatCode(id, updateData);
}

export async function deleteVatCode(input: unknown) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.deleteVatCode(parsed.data.id);
}

export async function createWhtCode(input: unknown) {
  const parsed = whtCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.createWhtCode(parsed.data);
}

export async function updateWhtCode(input: unknown) {
  const parsed = whtCodeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  const { id, ...updateData } = parsed.data;
  return settingsService.updateWhtCode(id, updateData);
}

export async function deleteWhtCode(input: unknown) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.deleteWhtCode(parsed.data.id);
}

export async function createPaymentCode(input: unknown) {
  const parsed = paymentCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.createPaymentCode(parsed.data);
}

export async function updatePaymentCode(input: unknown) {
  const parsed = paymentCodeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  const { id, ...updateData } = parsed.data;
  return settingsService.updatePaymentCode(id, updateData);
}

export async function deletePaymentCode(input: unknown) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.deletePaymentCode(parsed.data.id);
}

export async function createGlAccount(input: unknown) {
  const parsed = glAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.createGlAccount(parsed.data);
}

export async function updateGlAccount(input: unknown) {
  const parsed = glAccountUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  const { id, ...updateData } = parsed.data;
  return settingsService.updateGlAccount(id, updateData);
}

export async function deleteGlAccount(input: unknown) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.deleteGlAccount(parsed.data.id);
}

export async function updateConfig(input: unknown): Promise<Record<string, unknown>> {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors };
  }
  return settingsService.updateConfig(parsed.data) as Promise<Record<string, unknown>>;
}