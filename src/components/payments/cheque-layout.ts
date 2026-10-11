import { z } from "zod";

const fieldSchema = z.object({
  x: z.number().min(0).max(297), y: z.number().min(0).max(297),
  width: z.number().min(10).max(297), height: z.number().min(4).max(40),
  fontSize: z.number().min(8).max(24),
});
export const chequeLayoutSchema = z.object({
  version: z.literal(1), paper: z.enum(["cheque", "a4"]),
  width: z.number().min(120).max(250), height: z.number().min(60).max(140),
  offsetX: z.number().min(-20).max(200), offsetY: z.number().min(-20).max(250),
  buddhistYear: z.boolean(), crossed: z.boolean(),
  fields: z.object({ date: fieldSchema, payee: fieldSchema, words: fieldSchema, amount: fieldSchema, crossing: fieldSchema }),
});
export type ChequeLayout = z.infer<typeof chequeLayoutSchema>;
export type ChequeField = keyof ChequeLayout["fields"];
export const CHEQUE_FIELD_LABELS: Record<ChequeField, string> = {
  date: "วันที่เช็ค", payee: "ชื่อผู้รับเงิน", words: "จำนวนเงินตัวอักษร", amount: "จำนวนเงินตัวเลข", crossing: "ข้อความขีดคร่อม",
};
export const DEFAULT_CHEQUE_LAYOUT: ChequeLayout = {
  version: 1, paper: "cheque", width: 180, height: 90, offsetX: 0, offsetY: 0,
  buddhistYear: true, crossed: false,
  fields: {
    date: { x: 125, y: 12, width: 45, height: 8, fontSize: 14 },
    payee: { x: 25, y: 31, width: 140, height: 10, fontSize: 14 },
    words: { x: 25, y: 45, width: 140, height: 14, fontSize: 14 },
    amount: { x: 120, y: 65, width: 50, height: 9, fontSize: 16 },
    crossing: { x: 12, y: 6, width: 65, height: 7, fontSize: 10 },
  },
};

export function chequePaperSize(layout: ChequeLayout) {
  return layout.paper === "a4" ? { width: 210, height: 297 } : { width: layout.width, height: layout.height };
}

export function chequeLayoutIssues(layout: ChequeLayout): string[] {
  if (!chequeLayoutSchema.safeParse(layout).success) return ["ขนาดกระดาษหรือตำแหน่งอยู่นอกช่วงที่รองรับ"];
  const paper = chequePaperSize(layout);
  return (Object.keys(layout.fields) as ChequeField[]).flatMap((key) => {
    if (key === "crossing" && !layout.crossed) return [];
    const field = layout.fields[key];
    return field.x + layout.offsetX < 0 || field.y + layout.offsetY < 0 ||
      field.x + layout.offsetX + field.width > paper.width || field.y + layout.offsetY + field.height > paper.height
      ? [`${CHEQUE_FIELD_LABELS[key]} อยู่นอกหน้ากระดาษ`] : [];
  });
}
