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