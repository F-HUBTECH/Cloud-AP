import { format as fnsFormat, parseISO, isValid } from "date-fns";
import { th } from "date-fns/locale";

const THAI_BUDDHIST_YEAR_OFFSET = 543;

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatCurrency(value: number, currency: string = "THB"): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date, pattern: string = "dd/MM/yyyy"): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(parsed)) return "-";
  return fnsFormat(parsed, pattern);
}

export function formatDateThai(date: string | Date): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(parsed)) return "-";

  const day = fnsFormat(parsed, "d", { locale: th });
  const month = fnsFormat(parsed, "MMMM", { locale: th });
  const buddhistYear = parsed.getFullYear() + THAI_BUDDHIST_YEAR_OFFSET;

  return `${day} ${month} ${buddhistYear}`;
}

export function roundAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseNumber(value: string): number {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/,/g, "").replace(/\s/g, "");
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}