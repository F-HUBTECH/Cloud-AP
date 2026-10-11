export interface ChequePrintData {
  id: string;
  documentNumber: string;
  chequeNumber: string;
  chequeDate: string;
  payee: string;
  bankName: string;
  bankCode: string;
  currency: string;
  amount: number | null;
  status: string;
  updatedAt: string;
}

/** Convert exact two-decimal money to satang; reject rather than round. */
export function chequeSatang(amount: number | string | null): number {
  const value = String(amount);
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value)) {
    throw new Error("ยอดเช็คต้องเป็นจำนวนบวก ไม่เกิน 999,999,999.99 บาท และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
  }
  const [baht, fraction = ""] = value.split(".");
  const satang = Number(baht) * 100 + Number(fraction.padEnd(2, "0"));
  if (satang <= 0) throw new Error("ยอดเช็คต้องมากกว่าศูนย์");
  return satang;
}

function thaiInteger(value: number, hasMillions = false): string {
  if (value >= 1_000_000) {
    return thaiInteger(Math.floor(value / 1_000_000)) + "ล้าน" +
      (value % 1_000_000 ? thaiInteger(value % 1_000_000, true) : "");
  }
  const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const text = String(value);
  return [...text].map((character, index) => {
    const digit = Number(character);
    const place = text.length - index - 1;
    if (!digit) return "";
    if (place === 0 && digit === 1 && (value > 1 || hasMillions)) return "เอ็ด";
    if (place === 1 && digit === 1) return "สิบ";
    if (place === 1 && digit === 2) return "ยี่สิบ";
    return digits[digit] + places[place];
  }).join("");
}

export function chequeAmountWords(amount: number | string | null): string {
  const satang = chequeSatang(amount);
  const baht = Math.floor(satang / 100);
  const fraction = satang % 100;
  return (baht ? thaiInteger(baht) : "ศูนย์") + "บาท" +
    (fraction ? thaiInteger(fraction) + "สตางค์" : "ถ้วน");
}

export function chequeAmountNumber(amount: number | string | null): string {
  const satang = chequeSatang(amount);
  return `**${Math.floor(satang / 100).toLocaleString("en-US")}.${String(satang % 100).padStart(2, "0")}**`;
}

export function chequeDateText(date: string, buddhistYear: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${Number(year) + (buddhistYear ? 543 : 0)}`;
}

export function chequePrintIssues(payment: ChequePrintData): string[] {
  const issues: string[] = [];
  if (!["approved", "paid"].includes(payment.status)) issues.push("พิมพ์เช็คจริงได้เมื่อ Payment เป็น approved หรือ paid เท่านั้น");
  if (payment.currency !== "THB") issues.push("รูปแบบนี้รองรับเช็คสกุลเงินบาท (THB) เท่านั้น");
  if (!payment.chequeNumber.trim()) issues.push("Payment ยังไม่มีเลขที่เช็ค");
  if (!chequeDateText(payment.chequeDate, false)) issues.push("Payment ยังไม่มีวันที่เช็คที่ถูกต้อง");
  if (!payment.payee.trim()) issues.push("ไม่พบชื่อผู้รับเงินในข้อมูลผู้ขาย");
  try { chequeSatang(payment.amount); } catch (error) { issues.push((error as Error).message); }
  return issues;
}
