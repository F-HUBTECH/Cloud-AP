"use server";

import { paymentService } from "./payment.service";
import { createPaymentSchema } from "./payment.schema";
import { AppError } from "@/lib/errors";
import type { PaymentFormData, PaymentListParams } from "./payment.types";

export async function createPayment(formData: PaymentFormData) {
  try {
    const validated = createPaymentSchema.parse(formData);
    const result = await paymentService.create(validated as PaymentFormData);
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
    return { success: false, error: "Failed to create payment" };
  }
}

export async function getPayments(params?: PaymentListParams) {
  try {
    const result = await paymentService.list(params);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch payments" };
  }
}

export async function getPaymentById(id: string) {
  try {
    const result = await paymentService.getById(id);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch payment" };
  }
}

export async function approvePayment(id: string) {
  try {
    const result = await paymentService.approve(id);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to approve payment" };
  }
}

export async function payPayment(id: string, payDate: string, chequeNumber?: string, remark?: string) {
  try {
    const result = await paymentService.pay(id, payDate, chequeNumber, remark);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to process payment" };
  }
}

export async function cancelPayment(id: string, reason: string) {
  try {
    const result = await paymentService.cancelPayment(id, reason);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to cancel payment" };
  }
}

export async function cancelAssignment(id: string, reason: string) {
  try {
    const result = await paymentService.cancelAssign(id, reason);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to cancel assignment" };
  }
}

export async function searchOutstandingInvoices(supplierCode?: string) {
  try {
    const result = await paymentService.searchOutstanding(supplierCode);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to search outstanding invoices" };
  }
}