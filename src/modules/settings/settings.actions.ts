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
  const data = apTypeSchema.parse(input);
  return settingsService.createApType(data);
}

export async function updateApType(input: unknown) {
  const data = apTypeUpdateSchema.parse(input);
  const { id, ...updateData } = data;
  return settingsService.updateApType(id, updateData);
}

export async function deleteApType(input: unknown) {
  const { id } = deleteSchema.parse(input);
  return settingsService.deleteApType(id);
}

export async function createVatCode(input: unknown) {
  const data = vatCodeSchema.parse(input);
  return settingsService.createVatCode(data);
}

export async function updateVatCode(input: unknown) {
  const data = vatCodeUpdateSchema.parse(input);
  const { id, ...updateData } = data;
  return settingsService.updateVatCode(id, updateData);
}

export async function deleteVatCode(input: unknown) {
  const { id } = deleteSchema.parse(input);
  return settingsService.deleteVatCode(id);
}

export async function createWhtCode(input: unknown) {
  const data = whtCodeSchema.parse(input);
  return settingsService.createWhtCode(data);
}

export async function updateWhtCode(input: unknown) {
  const data = whtCodeUpdateSchema.parse(input);
  const { id, ...updateData } = data;
  return settingsService.updateWhtCode(id, updateData);
}

export async function deleteWhtCode(input: unknown) {
  const { id } = deleteSchema.parse(input);
  return settingsService.deleteWhtCode(id);
}

export async function createPaymentCode(input: unknown) {
  const data = paymentCodeSchema.parse(input);
  return settingsService.createPaymentCode(data);
}

export async function updatePaymentCode(input: unknown) {
  const data = paymentCodeUpdateSchema.parse(input);
  const { id, ...updateData } = data;
  return settingsService.updatePaymentCode(id, updateData);
}

export async function deletePaymentCode(input: unknown) {
  const { id } = deleteSchema.parse(input);
  return settingsService.deletePaymentCode(id);
}

export async function createGlAccount(input: unknown) {
  const data = glAccountSchema.parse(input);
  return settingsService.createGlAccount(data);
}

export async function updateGlAccount(input: unknown) {
  const data = glAccountUpdateSchema.parse(input);
  const { id, ...updateData } = data;
  return settingsService.updateGlAccount(id, updateData);
}

export async function deleteGlAccount(input: unknown) {
  const { id } = deleteSchema.parse(input);
  return settingsService.deleteGlAccount(id);
}

export async function updateConfig(input: unknown): Promise<Record<string, unknown>> {
  const data = configSchema.parse(input);
  return settingsService.updateConfig(data) as Promise<Record<string, unknown>>;
}