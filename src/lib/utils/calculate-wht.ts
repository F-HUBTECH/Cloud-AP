export interface WhtCalculationResult {
  baseAmount: number;
  whtRate: number;
  whtAmount: number;
  netAmount: number;
}

export function calculateWht(baseAmount: number, whtRate: number): WhtCalculationResult {
  const whtAmount = baseAmount * whtRate;
  const netAmount = baseAmount - whtAmount;
  return {
    baseAmount,
    whtRate,
    whtAmount: Math.round(whtAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}

export function calculateWhtAmount(baseAmount: number, whtRate: number): number {
  return Math.round(baseAmount * whtRate * 100) / 100;
}

export function isAssignOnZero(whtRate: number): boolean {
  return whtRate === 0;
}

export function calculateNetAfterWht(baseAmount: number, whtRate: number): number {
  const whtAmount = calculateWhtAmount(baseAmount, whtRate);
  return Math.round((baseAmount - whtAmount) * 100) / 100;
}