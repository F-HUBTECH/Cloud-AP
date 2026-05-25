# KSAP — Accounts Payable System

Next.js 15 App Router + Supabase (PostgreSQL + Auth + Storage) ระบบลูกหนี้การค้า

## โครงสร้างโปรเจกต์

```
ksap-next/
├── supabase/
│   ├── config.toml                          # Supabase CLI config
│   ├── seed.sql                              # ข้อมูลเริ่มต้น (roles, config, master data, i18n)
│   └── migrations/
│       └── 00001_initial_schema.sql          # Full schema (33 tables + RLS + functions)
├── src/
│   ├── app/                                  # Next.js App Router
│   │   ├── layout.tsx                        # Root layout
│   │   ├── page.tsx                          # Redirect → /dashboard หรือ /login
│   │   ├── globals.css                       # Tailwind + CSS variables
│   │   ├── (auth)/                           # Auth group (no sidebar)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts
│   │   └── (protected)/                     # Auth required (sidebar + header)
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── vendors/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── postings/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/page.tsx
│   │       └── payments/
│   │           ├── page.tsx
│   │           ├── [id]/page.tsx
│   │           └── assign/[vendorId]/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── dialog.tsx
│   │       └── table.tsx
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-permission.ts
│   ├── lib/
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── admin.ts
│   │   └── utils/
│   │       ├── calculate-vat.ts
│   │       ├── calculate-wht.ts
│   │       ├── cn.ts
│   │       ├── format.ts
│   │       └── permissions.ts
│   ├── middleware.ts                          # Auth guard
│   └── modules/
│       ├── auth/
│       │   ├── auth.types.ts
│       │   ├── auth.service.ts
│       │   └── auth.actions.ts
│       ├── vendor/
│       │   ├── vendor.types.ts
│       │   ├── vendor.schema.ts
│       │   ├── vendor.service.ts
│       │   ├── vendor.actions.ts
│       │   └── vendor.queries.ts
│       ├── posting/
│       │   ├── posting.types.ts
│       │   ├── posting.schema.ts
│       │   ├── posting.service.ts
│       │   └── posting.actions.ts
│       ├── payment/
│       │   ├── payment.types.ts
│       │   ├── payment.schema.ts
│       │   ├── payment.service.ts
│       │   ├── payment.actions.ts
│       │   └── withholding-tax.service.ts
│       └── approval/
│           ├── approval.types.ts
│           ├── approval.service.ts
│           └── approval.actions.ts
```

## ขั้นตอนติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
cd ksap-next
npm install
```

### 2. ตั้งค่า Supabase

```bash
# แก้ไข .env.local ใส่ credentials จริง
# NEXT_PUBLIC_SUPABASE_URL=https://yboyoqifawebmhkimexi.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 3. Deploy Database Schema

```bash
# วิธีที่ 1: ใช้ Supabase CLI
supabase db push

# วิธีที่ 2: รัน SQL ใน Supabase Dashboard → SQL Editor
# Copy ไฟล์ supabase/migrations/00001_initial_schema.sql ไปรัน
# แล้วรัน supabase/seed.sql ตาม
```

### 4. สร้างผู้ใช้งาน Admin

ไปที่ Supabase Dashboard → Authentication → Users แล้วสร้างผู้ใช้:
- Email: admin@ksap.local
- Password: (ตั้งเอง)

แล้วรัน SQL เพื่อเพิ่มในตาราง app_users:

```sql
INSERT INTO app_users (auth_user_id, login_name, display_name, department, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ksap.local'),
  'admin', 'Administrator', 'IT', true
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u, roles r
WHERE u.login_name = 'admin' AND r.code = 'ADMIN';
```

### 5. รัน Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ http://localhost:3000

### 6. Build สำหรับ Production

```bash
npm run build
npm start
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router + React 19 + TypeScript |
| UI | Tailwind CSS 3.4 + CSS Variables |
| State | Server Actions + React Hook Form + Zod |
| Auth | Supabase Auth (JWT + Row Level Security) |
| Database | Supabase PostgreSQL 15 |
| Storage | Supabase Storage (invoice PDFs) |
| Realtime | Supabase Realtime (dashboard) |
| Validation | Zod schemas in every module |
| API | Server Actions (mutations) + RSC (queries) |

## โครงสร้างสิทธิ์ (Role-Based Access)

| Role | สิทธิ์ |
|---|---|
| ADMIN | ทุกอย่าง — config, users, ปิดงวด, ลบข้อมูล |
| FINANCE | เห็นทุก invoice/payment — CRUD ข้อมูล AP ได้ ยกเว้น config |
| APPROVER | เห็นเฉพาะที่ assigned ให้อนุมัติ + ของตัวเอง |
| USER | เห็นเฉพาะของตัวเอง — สร้างได้ แก้ไขได้เฉพาะ DRAFT |

## Database Schema

ดูรายละเอียดเต็มได้ที่ `supabase/migrations/00001_initial_schema.sql`

ตารางหลัก 33 ตาราง รวม:
- Master: vendors, ap_types, vat_codes, wht_codes, payment_codes
- Transaction: invoices, invoice_items, payments, payment_items, payment_invoices
- Approval: approvals, approval_policies
- WHT: withholding_taxes, wht_per_supplier
- Period: periods, month_end, vendor_monthly_balances
- Config: config, app_users, roles, user_roles, role_rights
- Audit: audit_logs (immutable)

## Migration จาก Delphi KSAP → Next.js

| Feature | Delphi KSAP | Next.js KSAP |
|---|---|---|
| Frontend | Delphi VCL | Next.js + React |
| Backend | ฝังใน form | Server Actions + PostgreSQL Functions |
| Database | MySQL MyISAM | PostgreSQL (FK + RLS + transactions) |
| Auth | plain text password | Supabase Auth + JWT |
| Permission | authorize table ตรวจใน form | RLS + role_rights table |
| Doc Number | rundocno table (race condition) | next_doc_number() atomic function |
| Vendor Balance | amt01-15, pay01-15 denormalized | vendor_monthly_balances normalized |
| Audit | users/utime/upd/ip per row | audit_logs table (immutable JSONB) |
| Invoice PDF | ไม่มี | Supabase Storage |
| Realtime | ไม่มี | Supabase Realtime |
| Report | FastReport .fr3 | Next.js (future) |