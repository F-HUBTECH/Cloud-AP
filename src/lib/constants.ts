export const APP_NAME = "TKAP";
export const APP_VERSION = "1.0.0";

export const MODULE_CODES = {
  CONFIG: "CFG",
  SUPPLIER: "SUP",
  VOUCHER_AP: "VCP",
  VOUCHER_PAYMENT: "VPY",
  REPORT: "RPT",
  APPROVAL: "APR",
  PERIOD: "PER",
  MENU: "MNU",
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];

export const RIGHT_CODES = {
  CFG_C: "C001",
  CFG_R: "C002",
  CFG_U: "C003",
  CFG_D: "C004",
  SUP_C: "C005",
  SUP_R: "C006",
  SUP_U: "C007",
  SUP_D: "C008",
  VCP_C: "C009",
  VCP_R: "C010",
  VCP_U: "C011",
  VCP_D: "C012",
  VPY_C: "C013",
  VPY_R: "C014",
  VPY_U: "C015",
  VPY_D: "C016",
  RPT_R: "C017",
  APR_R: "C018",
  APR_U: "C019",
  PER_C: "C020",
  PER_R: "C021",
  PER_U: "C022",
  PER_D: "C023",
  MNU_C: "C024",
  MNU_R: "C025",
  MNU_U: "C026",
  MNU_D: "C027",
  SUP_APP: "C028",
  VCP_APP: "C029",
  VPY_APP: "C030",
} as const;

export type RightCode = (typeof RIGHT_CODES)[keyof typeof RIGHT_CODES];

export const VOUCHER_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
  POSTED: "posted",
  CANCELLED: "cancelled",
  VOIDED: "voided",
} as const;

export type VoucherStatus = (typeof VOUCHER_STATUS)[keyof typeof VOUCHER_STATUS];

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const RECORD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

export const PERIOD_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type PeriodStatus = (typeof PERIOD_STATUS)[keyof typeof PERIOD_STATUS];

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

export const TRANSACTION_TYPES = {
  AP_VOUCHER: "APV",
  AP_CREDIT_NOTE: "ACN",
  AP_DEBIT_NOTE: "ADN",
  AP_PAYMENT: "APY",
  AP_ADVANCE: "AAD",
} as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const VAT_MODES = {
  INCLUSIVE: "inclusive",
  EXCLUSIVE: "exclusive",
  EXEMPT: "exempt",
  NONE: "none",
} as const;

export type VatMode = (typeof VAT_MODES)[keyof typeof VAT_MODES];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;