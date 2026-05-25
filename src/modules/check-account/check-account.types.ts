export interface GLAccountBalance {
  code: string;
  name: string;
  drTotal: number;
  crTotal: number;
  balance: number;
}

export interface VendorSubLedgerBalance {
  code: string;
  name_en: string;
  name_th: string | null;
  totalAmount: number;
  totalPayment: number;
  openAmount: number;
  balance: number;
}

export interface CheckAccountResult {
  glBalances: GLAccountBalance[];
  vendorBalances: VendorSubLedgerBalance[];
  glTotal: number;
  apTotal: number;
  difference: number;
  isBalanced: boolean;
}

export interface CheckAccountParams {
  periodMonth?: string;
  periodYear?: string;
}