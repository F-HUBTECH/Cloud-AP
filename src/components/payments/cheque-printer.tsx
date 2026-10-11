"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Printer, RotateCcw, Save } from "lucide-react";
import { prepareChequePrint } from "@/modules/payment/cheque.actions";
import { chequeAmountNumber, chequeAmountWords, chequeDateText, chequePrintIssues, type ChequePrintData } from "@/modules/payment/cheque";
import { CHEQUE_FIELD_LABELS, DEFAULT_CHEQUE_LAYOUT, chequeLayoutIssues, chequeLayoutSchema, chequePaperSize, type ChequeField, type ChequeLayout } from "./cheque-layout";
import styles from "./cheque-printer.module.css";

function printValues(payment: ChequePrintData, layout: ChequeLayout): Record<ChequeField, string> {
  let amount = "—";
  let words = "ยอดเงินไม่ถูกต้อง";
  try { amount = chequeAmountNumber(payment.amount); words = chequeAmountWords(payment.amount); } catch { /* Errors shown above the preview. */ }
  return { date: chequeDateText(payment.chequeDate, layout.buddhistYear) || "ไม่มีวันที่เช็ค", payee: payment.payee || "ไม่มีชื่อผู้รับเงิน", amount, words, crossing: "A/C PAYEE ONLY" };
}

function ChequePaper({ payment, layout, preview = false, test = false }: { payment: ChequePrintData; layout: ChequeLayout; preview?: boolean; test?: boolean }) {
  const size = chequePaperSize(layout);
  const values = printValues(payment, layout);
  return <div className={`${styles.paper} ${preview ? styles.preview : ""}`} style={{ width: `${size.width}mm`, height: `${size.height}mm` }}>
    {(Object.keys(layout.fields) as ChequeField[]).filter((key) => key !== "crossing" || layout.crossed).map((key) => {
      const field = layout.fields[key];
      return <div key={key} data-cheque-field={key} aria-label={CHEQUE_FIELD_LABELS[key]} className={`${styles.field} ${key === "crossing" ? styles.crossing : ""}`} style={{ left: `${field.x + layout.offsetX}mm`, top: `${field.y + layout.offsetY}mm`, width: `${field.width}mm`, height: `${field.height}mm`, fontSize: `${field.fontSize}pt`, textAlign: key === "amount" ? "right" : undefined }}><span className={styles.fieldText}>{values[key]}</span></div>;
    })}
    {test && <div className={styles.watermark}>ทดสอบ / TEST — VOID</div>}
    {preview && <div className={styles.guide}>ตัวอย่างตำแหน่ง · {size.width} × {size.height} mm · เลขที่เช็ค {payment.chequeNumber || "—"}</div>}
  </div>;
}

function NumberSetting({ label, value, onChange, min, max, unit = "mm" }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; unit?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-muted-foreground">{label} ({unit})</span><input type="number" className="input-field" min={min} max={max} step={unit === "pt" ? 1 : 0.5} value={value} onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))} /></label>;
}

export function ChequePrinter({ payment }: { payment: ChequePrintData }) {
  const [layout, setLayout] = useState<ChequeLayout>(DEFAULT_CHEQUE_LAYOUT);
  const [fieldKey, setFieldKey] = useState<ChequeField>("payee");
  const [mounted, setMounted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [printMode, setPrintMode] = useState<"actual" | "test" | null>(null);
  const [overflow, setOverflow] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const storageKey = `ksap.cheque-layout.v1:${payment.bankCode || payment.bankName || "default"}`;
  const issues = chequePrintIssues(payment);
  const layoutIssues = chequeLayoutIssues(layout);
  const field = layout.fields[fieldKey];
  const size = chequePaperSize(layout);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const result = chequeLayoutSchema.safeParse(JSON.parse(saved));
        if (result.success) setLayout(result.data);
        else setMessage("รูปแบบที่บันทึกไว้ไม่ถูกต้อง จึงใช้รูปแบบเริ่มต้น");
      }
    } catch { setMessage("ไม่สามารถโหลดรูปแบบจากเบราว์เซอร์ได้ ใช้รูปแบบเริ่มต้น"); }
    const afterPrint = () => { setPrintMode(null); setConfirmed(false); };
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const check = () => {
      if (!active) return;
      const fields = previewRef.current?.querySelectorAll<HTMLElement>("[data-cheque-field]") ?? [];
      setOverflow(Array.from(fields).filter((element) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1).map((element) => `${CHEQUE_FIELD_LABELS[element.dataset.chequeField as ChequeField]} ยาวเกินกรอบ ให้ขยายกรอบหรือลดขนาดตัวอักษร`));
    };
    check();
    void document.fonts.ready.then(check);
    setConfirmed(false);
    return () => { active = false; };
  }, [layout, payment]);

  function updateLayout(patch: Partial<ChequeLayout>) { setLayout((current) => ({ ...current, ...patch })); setMessage(""); }
  function updateField(patch: Partial<typeof field>) { updateLayout({ fields: { ...layout.fields, [fieldKey]: { ...field, ...patch } } }); }

  function saveLayout() {
    if (layoutIssues.length) return;
    try { localStorage.setItem(storageKey, JSON.stringify(layout)); setMessage("บันทึกรูปแบบสำหรับธนาคารนี้ในเบราว์เซอร์แล้ว"); }
    catch { setMessage("เบราว์เซอร์ไม่อนุญาตให้บันทึกรูปแบบ แต่ยังพิมพ์ได้"); }
  }

  async function printCheque(test: boolean) {
    if (busy || layoutIssues.length || overflow.length || (!test && (issues.length || !confirmed))) return;
    setBusy(true); setMessage("");
    try {
      if (!test) {
        const result = await prepareChequePrint(payment.id);
        if (!result.success) { setMessage(result.error); return; }
        if (JSON.stringify(result.data) !== JSON.stringify(payment)) {
          setMessage("ข้อมูล Payment เปลี่ยนแล้ว กรุณาโหลดหน้าใหม่และตรวจเช็คอีกครั้ง"); setConfirmed(false); return;
        }
      }
      await document.fonts.ready;
      flushSync(() => setPrintMode(test ? "test" : "actual"));
      window.print();
      setMessage("เปิดหน้าต่างพิมพ์แล้ว กรุณาตรวจผลจากเครื่องพิมพ์ การพิมพ์ไม่เปลี่ยนสถานะ Payment");
    } catch { setPrintMode(null); setMessage("เปิดหน้าต่างพิมพ์ไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Link href={`/payments/${payment.id}`} className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />กลับไป Payment</Link><h1 className="text-2xl font-bold">Print Cheque / พิมพ์เช็ค</h1><p className="mt-1 text-sm text-muted-foreground">{payment.documentNumber} · {payment.bankName || payment.bankCode || "ยังไม่ได้ระบุธนาคาร"} · {payment.status}</p></div>
      <div className="flex flex-wrap gap-2"><button className="btn-outline" disabled={busy || !!layoutIssues.length || !!overflow.length} onClick={() => printCheque(true)}><Printer className="h-4 w-4" />พิมพ์ทดสอบ</button><button className="btn-primary" disabled={busy || !confirmed || !!issues.length || !!layoutIssues.length || !!overflow.length} onClick={() => printCheque(false)}><Printer className="h-4 w-4" />{busy ? "กำลังเตรียม…" : "พิมพ์เช็คจริง"}</button></div>
    </div>

    <fieldset disabled={busy} className="min-w-0 space-y-6">
    <div className="card grid gap-4 p-5 sm:grid-cols-3"><div><p className="text-sm text-muted-foreground">ผู้รับเงิน</p><p className="mt-1 font-medium">{payment.payee || "—"}</p></div><div><p className="text-sm text-muted-foreground">เลขที่เช็ค / วันที่</p><p className="mt-1 font-medium">{payment.chequeNumber || "—"} / {chequeDateText(payment.chequeDate, layout.buddhistYear) || "—"}</p></div><div><p className="text-sm text-muted-foreground">ยอดสุทธิหลังหัก WHT</p><p className="mt-1 font-mono text-lg font-semibold">{printValues(payment, layout).amount} {payment.currency}</p></div></div>

    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">รูปแบบเริ่มต้น 180 × 90 mm เป็นตัวอย่างทั่วไป กรุณาวัดเช็คและปรับตำแหน่งให้ตรงกับธนาคารของคุณ พิมพ์ทดสอบบนกระดาษเปล่าก่อน ใส่เช็คสำเร็จรูปเมื่อตำแหน่งถูกต้องแล้ว เลขที่เช็คและกรอบตัวอย่างจะไม่พิมพ์ทับลงบนเช็ค</div>
    {[...issues, ...layoutIssues, ...overflow].length > 0 && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><ul className="list-inside list-disc">{[...issues, ...layoutIssues, ...overflow].map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
    {message && <p role="status" className="rounded-lg border bg-muted p-3 text-sm">{message}</p>}

    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><h2 className="font-semibold">ตัวอย่างก่อนพิมพ์</h2><span className="text-sm text-muted-foreground">กริด 10 mm · เลื่อนแนวนอนเพื่อดูเต็มแผ่น</span></div><div ref={previewRef} className="overflow-auto bg-slate-100 p-6"><ChequePaper payment={payment} layout={layout} preview /></div></section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-5"><h2 className="font-semibold">กระดาษและการวางเช็ค</h2><label className="block text-sm">กระดาษ<select className="input-field mt-1" value={layout.paper} onChange={(e) => updateLayout({ paper: e.target.value as ChequeLayout["paper"] })}><option value="cheque">เช็คสำเร็จรูป / ขนาดกำหนดเอง</option><option value="a4">A4 แนวตั้ง (วางเช็คจากมุมซ้ายบน)</option></select></label><div className="grid grid-cols-2 gap-3">
        {layout.paper === "cheque" && <><NumberSetting label="ความกว้าง" value={layout.width} min={120} max={250} onChange={(width) => updateLayout({ width })} /><NumberSetting label="ความสูง" value={layout.height} min={60} max={140} onChange={(height) => updateLayout({ height })} /></>}
        <NumberSetting label="เลื่อนทั้งหมดแนวนอน" value={layout.offsetX} min={-20} max={200} onChange={(offsetX) => updateLayout({ offsetX })} /><NumberSetting label="เลื่อนทั้งหมดแนวตั้ง" value={layout.offsetY} min={-20} max={250} onChange={(offsetY) => updateLayout({ offsetY })} />
      </div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={layout.buddhistYear} onChange={(e) => updateLayout({ buddhistYear: e.target.checked })} />พิมพ์วันที่เป็นปี พ.ศ. (ปิดเพื่อใช้ ค.ศ.)</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={layout.crossed} onChange={(e) => updateLayout({ crossed: e.target.checked })} />พิมพ์ข้อความขีดคร่อม A/C PAYEE ONLY</label></section>
      <section className="card space-y-4 p-5"><h2 className="font-semibold">ตำแหน่งข้อความ</h2><label className="block text-sm">เลือกข้อความ<select className="input-field mt-1" value={fieldKey} onChange={(e) => setFieldKey(e.target.value as ChequeField)}>{(Object.keys(CHEQUE_FIELD_LABELS) as ChequeField[]).map((key) => <option key={key} value={key}>{CHEQUE_FIELD_LABELS[key]}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><NumberSetting label="จากขอบซ้าย" value={field.x} min={0} max={297} onChange={(x) => updateField({ x })} /><NumberSetting label="จากขอบบน" value={field.y} min={0} max={297} onChange={(y) => updateField({ y })} /><NumberSetting label="ความกว้างกรอบ" value={field.width} min={10} max={297} onChange={(width) => updateField({ width })} /><NumberSetting label="ความสูงกรอบ" value={field.height} min={4} max={40} onChange={(height) => updateField({ height })} /><NumberSetting label="ขนาดตัวอักษร" unit="pt" value={field.fontSize} min={8} max={24} onChange={(fontSize) => updateField({ fontSize })} /></div></section>
    </div>
    <div className="flex flex-wrap items-center gap-3"><button className="btn-outline" onClick={saveLayout} disabled={!!layoutIssues.length}><Save className="h-4 w-4" />บันทึกรูปแบบธนาคารนี้</button><button className="btn-ghost" onClick={() => updateLayout(DEFAULT_CHEQUE_LAYOUT)}><RotateCcw className="h-4 w-4" />คืนค่าเริ่มต้น</button><span className="text-sm text-muted-foreground">บันทึกเฉพาะรูปแบบในเบราว์เซอร์นี้</span></div>
    <section className="card space-y-3 p-5"><h2 className="font-semibold">ก่อนพิมพ์จริง</h2><p className="text-sm text-muted-foreground">ตั้งเครื่องพิมพ์เป็น {size.width} × {size.height} mm, Scale 100%, Margins None และปิด Headers / Footers ตรวจทิศทางป้อนกระดาษกับเครื่องพิมพ์ของคุณ</p><label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!issues.length || !!layoutIssues.length || !!overflow.length} /><span>ตรวจชื่อผู้รับเงิน วันที่ ยอดสุทธิ และตำแหน่งกับเช็คเลขที่ <strong>{payment.chequeNumber || "—"}</strong> แล้ว หากพิมพ์ซ้ำได้ตรวจสอบเช็คเดิมแล้ว</span></label><p className="text-sm text-muted-foreground">การพิมพ์ไม่เปลี่ยนสถานะ Payment เป็น paid ให้ดำเนินการ Mark as Paid ตามขั้นตอนจ่ายเงินจริง</p></section>

    </fieldset>
    {mounted && createPortal(<div id="ksap-cheque-print" style={{ display: "none" }}>
      <style>{`@media print { @page { size: ${size.width}mm ${size.height}mm; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; background: white !important; } body > *:not(#ksap-cheque-print) { display: none !important; } #ksap-cheque-print { display: block !important; color: black !important; } }`}</style>
      {printMode ? <ChequePaper payment={payment} layout={layout} test={printMode === "test"} /> : <p>กรุณาใช้ปุ่มพิมพ์เช็คในหน้าตัวอย่างเพื่อตรวจสอบข้อมูลก่อนพิมพ์</p>}
    </div>, document.body)}
  </div>;
}
