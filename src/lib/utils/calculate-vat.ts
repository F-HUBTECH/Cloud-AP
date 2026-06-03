const VAT_RATE = 0.07;

export interface VatCalculationResult {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export function calculateVatInclusive(totalAmount: number): VatCalculationResult {
  const baseAmount = totalAmount / (1 + VAT_RATE);
  const vatAmount = totalAmount - baseAmount;
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount,
  };
}

export function calculateVatExclusive(baseAmount: number): VatCalculationResult {
  const vatAmount = baseAmount * VAT_RATE;
  const totalAmount = baseAmount + vatAmount;
  return {
    baseAmount,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export function calculateNoVat(amount: number): VatCalculationResult {
  return {
    baseAmount: amount,
    vatAmount: 0,
    totalAmount: amount,
  };
}

export type VatMode = "inclusive" | "exclusive" | "none";

export interface VoucherLineItem {
  amount: number;
  vatMode: VatMode;
}

export interface VoucherTotals {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface VatTotals {
  totalNoVat: number;
  totalVat: number;
  totalApTrade: number;
}

export function calculateItemsVat(
  items: Array<{ drAmount?: number; crAmount?: number }>,
  vatType: VatMode | string,
  whtAmountOverride?: number
): VatTotals {
  let totalNoVat = 0;
  let totalVat = 0;

  for (const item of items) {
    const amount = item.drAmount || item.crAmount || 0;
    let result: VatCalculationResult;
    switch (vatType) {
      case "inclusive":
        result = calculateVatInclusive(amount);
        break;
      case "exclusive":
        result = calculateVatExclusive(amount);
        break;
      case "exempt":
        result = calculateNoVat(amount);
        break;
      default:
        result = calculateNoVat(amount);
        break;
    }
    totalNoVat += result.baseAmount;
    totalVat += result.vatAmount;
  }

  const whtAmount = whtAmountOverride ?? 0;
  const totalApTrade = totalNoVat + totalVat - whtAmount;

  return {
    totalNoVat: Math.round(totalNoVat * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalApTrade: Math.round(totalApTrade * 100) / 100,
  };
}

export function calculateVoucherTotals(items: VoucherLineItem[]): VoucherTotals {
  let baseAmount = 0;
  let vatAmount = 0;
  let totalAmount = 0;

  for (const item of items) {
    let result: VatCalculationResult;
    switch (item.vatMode) {
      case "inclusive":
        result = calculateVatInclusive(item.amount);
        break;
      case "exclusive":
        result = calculateVatExclusive(item.amount);
        break;
      case "none":
      default:
        result = calculateNoVat(item.amount);
        break;
    }
    baseAmount += result.baseAmount;
    vatAmount += result.vatAmount;
    totalAmount += result.totalAmount;
  }

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}