---
name: TKAP — Accounts Payable
description: ระบบบัญชีเจ้าหนี้สำหรับพนักงานบัญชี — สะอาด เงียบ เร็ว
colors:
  ledger-blue: "#2563eb"
  ink-black: "#020817"
  paper-white: "#ffffff"
  frost-gray: "#f1f5f9"
  slate-muted: "#64748b"
  hairline-gray: "#e2e8f0"
  destructive-red: "#ef4444"
  off-white: "#f8fafc"
  dark-slate: "#0f172a"
typography:
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  badge:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-blue}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.ledger-blue}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  input-field:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-success:
    backgroundColor: "#f0fdf4"
    textColor: "#15803d"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.badge}"
  badge-warning:
    backgroundColor: "#fefce8"
    textColor: "#a16207"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.badge}"
  badge-danger:
    backgroundColor: "#fef2f2"
    textColor: "#b91c1c"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.badge}"
  sidebar-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    typography: "{typography.body}"
  sidebar-link-active:
    backgroundColor: "{colors.ledger-blue}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    typography: "{typography.label}"
  data-table-row:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    padding: "12px 16px"
    typography: "{typography.body}"
  data-table-row-hover:
    backgroundColor: "{colors.frost-gray}"
    textColor: "{colors.ink-black}"
    padding: "12px 16px"
    typography: "{typography.body}"
---

# Design System: TKAP — Accounts Payable

## 1. Overview

**Creative North Star: "The Clear Desk"**

โต๊ะทำงานของนักบัญชีที่จัดระเบียบเรียบร้อย — กระดาษวางตรง กองเอกสารแยกชัด ปากกาอยู่ในที่ของมัน เมื่อนั่งลงแล้วพร้อมทำงานทันที ไม่มีอะไรเกะกะสายตา ไม่ต้องค้นหาอะไร

TKAP คือโต๊ะตัวนั้นในรูปแบบดิจิทัล ทุก pixel มีหน้าที่ ทุก interaction ตอบสนองทันที ข้อมูลอยู่ตรงหน้าโดยไม่ต้องขุดคุ้ย ระบบไม่เรียกร้องความสนใจ — มันเพียงแค่อยู่ตรงนั้น พร้อม รอให้ผู้ใช้ทำงานของตัวเอง

มันไม่ใช่แอปที่สวยเพื่ออวดดีไซน์ และไม่ใช่ ERP ที่อัดข้อมูลจนหายใจไม่ออก มันคือพื้นที่ทำงานของนักบัญชี — สะอาด เงียบ ไว้ใจได้

**Key Characteristics:**
- องค์ประกอบทุกชิ้นมีหน้าที่ — ถ้าเอาออกแล้วงานยังเดินได้ แสดงว่ามันไม่จำเป็น
- ปฏิสัมพันธ์ทันที ไม่มี animation มาขวาง — กดปุ๊บ ติดปั๊บ
- ใช้สีพื้น (tonal layering) แทน shadow ในการแบ่ง layer — เรียบ ไม่มีอะไรลอย
- ข้อมูลมาก่อนเสมอ — typography ชัดเจน อ่านง่าย ตัวเลขอยู่ตรงกลางของทุกหน้า

สิ่งที่ระบบนี้ปฏิเสธ: UI รก สีฉูดฉาด หลาย font, ข้อมูลอัดแน่นแบบ ERP ดั้งเดิม, ลูกเล่น animation ที่ขวางการทำงาน

## 2. Colors

ชุดสีที่ให้ความรู้สึกมั่นคงและเป็นมืออาชีพ โดยมีสีฟ้าเป็นตัวนำเพียงสีเดียว — ใช้เท่าที่จำเป็น ไม่ฟุ่มเฟือย

### Primary
- **Ledger Blue** (#2563eb): ปุ่มหลัก, ลิงก์, sidebar active state, focus ring — ทุกจุดที่ต้องการความสนใจจากผู้ใช้ ใช้อย่างจำกัด ≤10% ของพื้นที่หน้าจอ

### Neutral
- **Ink Black** (#020817): ข้อความหลัก, headings, labels — สีของข้อมูล  
- **Paper White** (#ffffff): พื้นหลังหลัก, card, input fields, popover — สะอาด อ่านง่าย
- **Off White** (#f8fafc): ข้อความบนพื้นสีเข้ม (primary-foreground, destructive-foreground) — อ่านชัดบนสีฟ้า/แดง
- **Frost Gray** (#f1f5f9): พื้นหลังรอง (secondary, muted, accent), table header, hover states — tonal layer ที่แยกส่วนข้อมูลออกจากพื้นหลังหลัก
- **Slate Muted** (#64748b): ข้อความรอง, placeholder text, icons, table headers — ข้อมูลที่มีลำดับความสำคัญต่ำ
- **Dark Slate** (#0f172a): ข้อความบนพื้น Frost Gray (secondary-foreground, accent-foreground) — contrast เพียงพอบนพื้นเทา
- **Hairline Gray** (#e2e8f0): ขอบ card, input border, table borders, dividers — เส้นบาง ไม่รบกวน

### Semantic
- **Destructive Red** (#ef4444): ปุ่มลบ/ยกเลิก, error states — ใช้เฉพาะ destructive actions

### Named Rules
**The One Blue Rule.** Ledger Blue ใช้กับ ≤10% ของพื้นที่หน้าจอใด ๆ จุดเด่นของมันคือความหายาก ถ้าเห็นสีฟ้าเต็มหน้า แสดงว่ามีอะไรผิดปกติ

**The Flat Gray Rule.** Frost Gray, Hairline Gray, และ Slate Muted ใช้แทน shadow ในการแบ่ง layer — สีที่ต่างกันเล็กน้อยสร้างลำดับชั้นโดยไม่ต้องใช้เงา

## 3. Typography

**Font:** System UI stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) — โหลดเร็ว คมชัด native rendering, ไม่มี FOUT ผู้ใช้คุ้นเคยจากการใช้งาน OS ทั่วไป

**Character:** ตรงไปตรงมา ไม่อวดตัว — ฟอนต์ระบบที่ผู้ใช้เห็นทุกวันใน OS และแอปอื่น ๆ ไม่ต้องเรียนรู้รูปทรงตัวอักษรใหม่

### Hierarchy
- **Title** (700, clamp(1.25rem, 2.5vw, 1.5rem), line-height 1.3, tracking -0.025em): หัวข้อหน้าหลัก — Dashboard, Vendors, Postings (ใช้ text-2xl)
- **Body** (400, 1rem / 0.875rem, line-height 1.5): ข้อความทั่วไป, ตาราง, ฟอร์ม fields — ความยาวบรรทัดไม่เกิน 75ch ใน prose
- **Label** (500, 0.875rem, line-height 1): ป้ายฟอร์ม, ปุ่ม, sidebar links — กระชับ ไม่เยิ่นเย้อ
- **Badge** (600, 0.75rem, line-height 1): Status badges — เล็ก กระชับ อ่านเร็ว

### Named Rules
**The One Family Rule.** ใช้ system font เท่านั้นทั้งระบบ — ไม่มี font คู่ที่สอง ไม่มี display font ไม่มี mono font การตัดสินใจนี้ทำให้ UI สะอาดขึ้น โหลดเร็วขึ้น และรักษาความรู้สึก "เครื่องมือ" มากกว่า "นิตยสาร"

## 4. Elevation

ระบบนี้แบนราบ — ไม่มี box-shadow ในองค์ประกอบปกติใด ๆ เลย layout จัดการแยกโซน, z-index จัด modal/dropdown/toast, และ tonal color (Frost Gray vs Paper White) แยก header, sidebar, และ main content ออกจากกัน

ความลึกมาจากการซ้อนทับของสี ไม่ใช่การยกตัวขององค์ประกอบ เมื่อต้องการ overlay (dropdown menu, dialog) จะใช้ border + popover background แทน shadow หนัก ๆ

### Shadow Vocabulary
- **Dropdown** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`): เฉพาะ dropdown menu และ popover — เบา พอให้รู้ว่าลอย
- **Card** (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`): card container (shadow-sm) — เบามาก เกือบไม่รู้สึก

### Named Rules
**The Flat-By-Default Rule.** พื้นผิวทั้งหมดแบนที่ rest — shadow ปรากฏเฉพาะกับองค์ประกอบที่ลอยออกจาก layout flow (dropdown, popover) เท่านั้น

## 5. Components

### Buttons

**Character:** มั่นคง กดแล้วรู้ว่าเกิดอะไรขึ้น — ไม่มี animation ฟุ่มเฟือย มีแค่ hover opacity shift

- **Shape:** มุมมนเล็กน้อย (6px — rounded-md)
- **Primary:** Ledger Blue (#2563eb) บน Off White text — ใช้กับ action หลักของหน้านั้น ๆ มากสุด 1 ปุ่มต่อหน้าจอ
- **Hover:** opacity ลดเหลือ 0.9 — ทันที ไม่มี transition
- **Focus:** ring 2px Ledger Blue, offset 2px จากขอบ
- **Disabled:** opacity 0.5, cursor not-allowed
- **Secondary:** Frost Gray (#f1f5f9) บน Dark Slate (#0f172a) — action รอง
- **Outline:** Paper White พร้อมขอบ Hairline Gray — ใช้เมื่อ primary/secondary แย่งความสนใจกัน
- **Ghost:** โปร่งใส — sidebar collapse, actions ในแถวตาราง
- **Destructive:** Destructive Red (#ef4444) — เฉพาะ delete/void/cancel ที่แก้ไขไม่ได้

### Chips / Badges

- **Shape:** เต็มวง (9999px — rounded-full), ขนาดเล็ก (px-2.5 py-0.5)
- **Success:** พื้นหลัง #f0fdf4, ข้อความ #15803d, ขอบ #bbf7d0 — สถานะ approved, paid, active
- **Warning:** พื้นหลัง #fefce8, ข้อความ #a16207, ขอบ #fef08a — pending, draft
- **Danger:** พื้นหลัง #fef2f2, ข้อความ #b91c1c, ขอบ #fecaca — rejected, voided, overdue
- **Info:** พื้นหลัง #eff6ff, ข้อความ #1d4ed8, ขอบ #bfdbfe — informational states

### Cards

- **Character:** ภาชนะที่เบาที่สุด — เกือบไม่มีตัวตน
- **Corner Style:** 8px (rounded-lg)
- **Background:** Paper White พร้อมขอบ Hairline Gray
- **Shadow:** shadow-sm — เบามาก (0 1px 2px rgba(0,0,0,0.05))
- **Padding:** 24px (p-6) หรือ 32px (p-8) สำหรับหน้าจอ login

### Inputs / Fields

- **Style:** ขอบ Hairline Gray, พื้นหลัง Paper White, สูง 40px (h-10), padding แนวนอน 12px
- **Focus:** ring 2px Ledger Blue — แทนที่ขอบ, ไม่ใช่เพิ่มข้างบน
- **Placeholder:** Slate Muted (#64748b) — contrast ≥4.5:1 บนพื้นขาว
- **Disabled:** opacity 0.5, cursor not-allowed
- **Error:** ยังไม่มี design token — ใช้ destructive background tint + destructive text color

### Navigation

- **Sidebar:** กว้าง 256px (w-64), หดเหลือ 64px (w-16) — transition 200ms (ยกเลิกถ้า prefers-reduced-motion)
- **Sidebar background:** สีพื้นแยก (อ้างอิง `sidebar-background` — ยังไม่มีใน globals.css, ต้องเพิ่ม)
- **Link default:** โปร่งใส, ข้อความ Ink Black, icon Lucide 20px
- **Link hover:** Frost Gray background
- **Link active:** Ledger Blue background, Off White text, weight 500
- **Header:** สูง 56px (h-14), Paper White background, ขอบล่าง Hairline Gray
- **Collapse button:** Ghost style, กึ่งกลาง sidebar ด้านล่าง

### Data Tables

- **Container:** overflow-auto, ขอบ Hairline Gray, rounded-lg
- **Header:** Frost Gray background, Slate Muted text — ตัวหนังสือหนา 500
- **Row default:** ขอบล่าง Hairline Gray
- **Row hover:** Frost Gray background
- **Cell padding:** 12px แนวตั้ง (py-3), 16px แนวนอน (px-4)

## 6. Do's and Don'ts

### Do:
- **Do** ใช้ Ledger Blue เฉพาะกับ primary action และ active states — หนึ่งจุดเด่นต่อหน้าจอ
- **Do** ใช้ Frost Gray background เพื่อแยกส่วน header, sidebar, และ table headers จากเนื้อหาหลัก
- **Do** ใช้ system font stack (`system-ui`) เท่านั้น — ไม่ import ฟอนต์เพิ่มนอกจาก Inter (ที่โหลดไว้แล้วสำหรับ `--font-inter`)
- **Do** รักษาความกว้าง content ≤65-75ch สำหรับหน้า text-heavy
- **Do** ใช้ tonal layering (Frost Gray / Paper White / Off White) แทน box-shadow ในการสร้างลำดับชั้น
- **Do** ใช้ Lucide Icons ขนาด 16-20px — หนึ่งชุด, หนึ่งสไตล์
- **Do** ใส่ label ทุก input field — ใช้ `label-text` component เสมอ
- **Do** ใช้เลขทศนิยม 2 ตำแหน่ง, จัดชิดขวาสำหรับคอลัมน์ตัวเลขในตาราง

### Don't:
- **Don't** ใช้สีฟ้าเป็นพื้นหลังส่วนใด ๆ ของหน้า — Ledger Blue ใช้เฉพาะ accent ≤10%
- **Don't** ใช้ border-left หรือ border-right หนาเกิน 1px เป็นแถบสี — ใช้ background tint หรือ icon/ตัวเลขนำแทน
- **Don't** ใส่ animation ที่ใช้เวลานานกว่า 200ms — ระบบนี้คือเครื่องมือ ไม่ใช่ภาพยนตร์
- **Don't** ใช้ gradient, glassmorphism, หรือ `backdrop-filter: blur()` — ดูเหมือน marketing landing page ไม่ใช่เครื่องมือการเงิน
- **Don't** ใช้ `background-clip: text` กับ gradient — ต้องห้ามเด็ดขาด
- **Don't** ใส่ข้อมูลแน่นเกินไป — ถ้าต้องการพื้นที่มาก ใช้ pagination หรือ tab แทนการยัดทุกอย่างในหน้าเดียว
- **Don't** ใช้ฟอนต์มากกว่า 1 family — system font เท่านั้น
- **Don't** ซ่อน label ของ input fields — accessibility พื้นฐาน ต้องอ่านออกเสมอ
- **Don't** ใช้เงาหนัก (shadow-md, shadow-lg, shadow-xl) — ผิดหลัก Flat-By-Default
- **Don't** ใช้สีนอกจาก palette นี้ยกเว้นมีเหตุผลชัดเจน — ถ้าต้องเพิ่มสี semantic ใหม่ ต้องเพิ่มเป็น token ก่อน
