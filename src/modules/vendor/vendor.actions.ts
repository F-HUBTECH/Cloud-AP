"use server";

import { revalidatePath } from "next/cache";
import { vendorService } from "./vendor.service";
import { vendorSchema, vendorUpdateSchema, vendorSearchSchema } from "./vendor.schema";
import type { VendorFormData, VendorSearchParams } from "./vendor.types";

export async function createVendor(formData: VendorFormData) {
  const parsed = vendorSchema.safeParse(formData);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { success: false, error: "Validation failed", details: errors };
  }

  try {
    const vendor = await vendorService.create(parsed.data);
    revalidatePath("/vendors");
    return { success: true, data: vendor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create vendor";
    return { success: false, error: message };
  }
}

export async function updateVendor(id: string, formData: Partial<VendorFormData>) {
  const parsed = vendorUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { success: false, error: "Validation failed", details: errors };
  }

  try {
    const vendor = await vendorService.update(id, parsed.data);
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${id}`);
    return { success: true, data: vendor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update vendor";
    return { success: false, error: message };
  }
}

export async function deleteVendor(id: string) {
  try {
    await vendorService.delete(id);
    revalidatePath("/vendors");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete vendor";
    return { success: false, error: message };
  }
}

export async function getVendors(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}) {
  try {
    const result = await vendorService.list(params);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch vendors";
    return { success: false, error: message };
  }
}

export async function getVendorById(id: string) {
  try {
    const vendor = await vendorService.getById(id);
    return { success: true, data: vendor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch vendor";
    return { success: false, error: message };
  }
}

export async function searchVendors(params: VendorSearchParams) {
  const parsed = vendorSearchSchema.safeParse(params);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { success: false, error: "Validation failed", details: errors };
  }

  try {
    const result = await vendorService.search(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search vendors";
    return { success: false, error: message };
  }
}