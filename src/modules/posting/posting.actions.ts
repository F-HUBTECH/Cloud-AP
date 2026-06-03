"use server";

import { postingService } from "./posting.service";
import { postingHeaderSchema, postingSearchSchema } from "./posting.schema";
import { AppError } from "@/lib/errors";
import type { InvoiceFormData, InvoiceListParams } from "./posting.types";
import type { PostingSearchParams } from "./posting.schema";

export async function createVoucher(formData: InvoiceFormData) {
  try {
    const validated = postingHeaderSchema.parse(formData);
    const result = await postingService.create(validated as InvoiceFormData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      const details = zodError.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const key = issue.path.join(".");
        if (!acc[key]) acc[key] = [];
        acc[key].push(issue.message);
        return acc;
      }, {});
      return { success: false, error: "Validation failed", details };
    }
    return { success: false, error: "Failed to create voucher" };
  }
}

export async function updateVoucher(id: string, formData: Partial<InvoiceFormData>) {
  try {
    const result = await postingService.update(id, formData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update voucher" };
  }
}

export async function deleteVoucher(id: string) {
  try {
    await postingService.delete(id);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete voucher" };
  }
}

export async function getVouchers(params?: InvoiceListParams) {
  try {
    const result = await postingService.list(params);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch vouchers" };
  }
}

export async function getVoucherById(id: string) {
  try {
    const result = await postingService.getById(id);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch voucher" };
  }
}

export async function searchVouchers(searchParams: PostingSearchParams) {
  try {
    const validated = postingSearchSchema.parse(searchParams);
    const result = await postingService.search(validated as InvoiceListParams);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to search vouchers" };
  }
}

export async function markForPayment(ids: string[], supplierCode: string, periodMonth: string, periodYear: string) {
  try {
    await postingService.markForPayment(ids, supplierCode, periodMonth, periodYear);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to mark vouchers for payment" };
  }
}

export async function cancelVoucher(id: string, reason: string) {
  try {
    const result = await postingService.cancelInvoice(id, reason);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to cancel voucher" };
  }
}