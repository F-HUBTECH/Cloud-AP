"use server";

import { reportService } from "./report.service";

export async function getVendorBalanceReport() {
  return reportService.getVendorBalance();
}
