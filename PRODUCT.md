# Product

## Register

product

## Users

พนักงานบัญชี (accounting staff) — ใช้งานระบบทุกวัน ทำงานซ้ำ ๆ กับข้อมูล AP (ใบสำคัญจ่าย, การจ่ายเงิน, กระทบยอดธนาคาร, รายงาน WHT) ต้องการความสะดวกและรวดเร็วเป็นอันดับแรก

## Product Purpose

TKAP เป็นระบบ Accounts Payable ที่ย้ายจาก Delphi desktop มาเป็น web application บน Next.js + Supabase จัดการวงจร AP เต็มรูปแบบ: ข้อมูลผู้ขาย → ใบสำคัญจ่าย → อนุมัติ → จ่ายเงิน → กระทบยอด → รายงาน

เป้าหมาย: ให้พนักงานบัญชีทำงานได้เร็วขึ้น ผิดพลาดน้อยลง เมื่อเทียบกับระบบ Delphi เดิม โดยที่ UI ไม่เป็นอุปสรรคต่อการทำงาน

## Brand Personality

- **Quiet** — UI เงียบ ไม่เรียกร้องความสนใจ หลีกทางให้ข้อมูลและงานเป็นตัวนำ
- **Efficient** — ทุก interaction ออกแบบมาเพื่อความเร็วในการใช้งานซ้ำ ๆ ทุกวัน
- **Trustworthy** — ดูน่าเชื่อถือ มั่นคง เหมาะกับระบบการเงิน

บุคลิกหลัก: functional minimalism — "get out of the way"

## Anti-references

- ❌ UI รก สีสันฉูดฉาด หลาย font — ดู amateur ไม่น่าเชื่อถือ
- ❌ SAP / Oracle ERP แนวข้อมูลอัดแน่น ปุ่มเล็กเต็มจอ — ใช้งานยาก ช้าสำหรับ daily tasks
- ✅ Xero เป็นแรงบันดาลใจ — สะอาด สีฟ้า อ่านง่าย เป็นมิตร

## Design Principles

1. **Get out of the way** — UI ต้องหายไป ให้งานและข้อมูลนำ ผู้ใช้ไม่ควรต้องคิดว่า "ปุ่มอยู่ตรงไหน"
2. **Speed first** — ทุก interaction ต้องรองรับการใช้ซ้ำ daily repetitive tasks: ฟอร์มชัดเจน ปุ่มใหญ่พอ กดง่าย ตารางอ่านเร็ว
3. **Clarity over cleverness** — ภาษาตรงไปตรงมา pattern ที่คุ้นเคย ไม่แปลกใจ — ผู้ใช้บัญชีไม่ต้องการเรียนรู้ UI ใหม่
4. **Quiet confidence** — ดู professional โดยไม่ต้องตะโกน — ไม่มีสีสันที่ไม่จำเป็น ไม่มีลูกเล่นที่ขวางการทำงาน

## Accessibility & Inclusion

Basic accessibility: contrast เพียงพอสำหรับการอ่านนาน ๆ รองรับการปรับขนาดฟอนต์ได้ keyboard navigation สำหรับฟอร์มหลัก
