# KSAP — Agent Instructions

## Project Overview

Accounts Payable (AP) system migrated from Delphi KSAP to Next.js 15 App Router + Supabase (PostgreSQL + Auth + Storage). Supabase project: `yboyoqifawebmhkimexi`.

## Commands

```bash
npm run dev          # Dev server on :3000
npm run build        # Production build (run after changes to verify)
npm run lint         # ESLint
npm run type-check   # TypeScript check (tsc --noEmit)
```

There are **no tests** configured yet. `npm run build` is the primary verification step.

## Supabase

```bash
npm run db:push      # Push migrations to linked Supabase project
npm run db:reset     # Reset local DB (requires local Supabase)
npm run db:generate  # Regenerate src/lib/supabase/database.types.ts from remote schema
```

- Migrations: `supabase/migrations/`
- Seed: `supabase/seed.sql`
- Config: `supabase/config.toml` (db major_version = 17)
- Uses **public schema** (not `app.`) — all tables are in `public`
- Uses `gen_random_uuid()` (not `uuid_generate_v4()`)
- RLS uses `SECURITY DEFINER` helper functions `is_admin()` and `has_role()` to avoid infinite recursion — **never use raw EXISTS subqueries on `user_roles`/`roles` inside RLS policies**
- Auth trigger on `auth.users` auto-creates `app_users` row on signup
- Admin setup script: `scripts/setup-admin.sh` (needs `SUPABASE_SERVICE_ROLE_KEY` env var)
- `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Architecture

```
src/
  app/
    (auth)/          # Login, callback — no auth required
    (protected)/     # All authenticated pages — middleware checks auth + app_users.is_active
      bank-reconciliation/
      check-account/       # GL vs AP balance verification
      dashboard/
      debit-notes/
      deposit-applications/ # Apply deposits to invoices
      deposits/
      payments/
      period/month-end/ year-end/
      postings/
      reports/aging/ vendor-card/ detail-ledger/ payment-register/ invoice-register/ vendor-balance/
      settings/       # Sub-routes: company, gl-accounts, doc-number, ap-types, vat-rates, wht-rates, payment-codes, period, users
      transfers/
      vendors/
      witholding-tax/ # WHT report/certificate
  api/webhooks/supabase/route.ts  # Webhook handler
  modules/
    auth/            # auth.service.ts, auth.actions.ts, auth.types.ts
    approval/        # approval.service.ts, approval.actions.ts
    bank/            # bank.service.ts, bank.types.ts
    check-account/   # check-account.service.ts, check-account.types.ts
    debit-note/      # debit-note.service.ts, debit-note.types.ts
    deposit/         # deposit.service.ts, deposit.types.ts
    deposit-application/ # deposit-application.service.ts, deposit-application.types.ts
    gl-posting/      # gl-posting.service.ts (journal entries for invoices + payments)
    payment/         # payment.service.ts, payment.types.ts, payment.schema.ts, payment.actions.ts, withholding-tax.service.ts
    period/          # period.service.ts, period.actions.ts
    posting/         # posting.service.ts, posting.types.ts, posting.schema.ts, posting.actions.ts
    report/          # report.service.ts, report.types.ts (aging, vendor card, detail ledger, payment register, invoice register, vendor balance)
    settings/        # settings.service.ts, settings.schema.ts, settings.actions.ts, config.service.ts, gl-accounts.service.ts
    transfer/        # transfer.service.ts, transfer.types.ts, transfer.schema.ts, transfer.actions.ts
    vendor/          # vendor.service.ts, vendor.types.ts, vendor.schema.ts, vendor.actions.ts, vendor.queries.ts
  lib/
    supabase/         # client.ts (browser), server.ts (server), admin.ts (service role)
    utils/            # audit.ts, calculate-vat.ts, calculate-wht.ts, cn.ts, format.ts, permissions.ts, upload.ts
    constants.ts      # MODULE_CODES, VOUCHER_STATUS, PAYMENT_STATUS, etc.
    errors.ts         # AppError, NotFoundError, DuplicateError, PeriodClosedError
  components/
    layout/           # sidebar.tsx, header.tsx
    ui/               # button.tsx, input.tsx, select.tsx, dialog.tsx, table.tsx
  hooks/              # use-auth.ts, use-permission.ts, use-realtime.ts
  middleware.ts        # Auth guard — checks Supabase auth + app_users
```

## Database Table Names (Critical)

This project migrated from Delphi MySQL. Old names are **never used** in code. Always use the new names:

| Old (Delphi) | New (PostgreSQL) |
|---|---|
| `supplier` | `vendors` |
| `apposta` / `aptran` | `invoices` |
| `appostb` / `aptranb` | `invoice_items` |
| `apassignpaya` / `aptran` (payments) | `payments` |
| `apassignpayb` | `payment_items` |
| `apdeposita` | `deposit_payments` |
| `apdepositb` | `deposit_payment_items` |
| `apbankrecon` | `bank_reconciliations` |
| `apbankcheques` | `cheque_transactions` |
| `rundocno` | Use `supabase.rpc("next_doc_number", {...})` |
| `period` | `periods` |
| `users` | `app_users` |
| `withholding` | `withholding_taxes` |
| `wthtaxsup` | `wht_per_supplier` |
| `glaccount` / `chart_of_accounts` | `gl_accounts` |
| `config` (col `code`) | `config` (col `company_code`) |
| `bank` | `bank_accounts` |
| `apposta.mark` / `aptran.paided` | `invoices.status` / `payments.status` (enum strings, not numbers) |
| _(new table)_ | `deposit_applications` (links deposits to invoices) |

Key column renames: `rowids` → `id`, `suplyno` → `supplier_code`, `docno` → `doc_number`, `docdate` → `doc_date`, `name` → `name_en`, `nameoth` → `name_th`, `taxid` → `tax_id`, `closedate` → `closed` (boolean), `periodyr` → `period_year`, `periodmn` → `period_month`, `vendor_code` → `code` (on vendors table), `auth_uid` (not `id`) matches `auth.users.id`.

- `deposit_payments` now has `applied_amount` and `remaining_amount` columns (added in migration `20260420000001_deposit_applications.sql`)

## Status Enums

Use **string enums**, not numeric flags:
- `invoices.status`: `'draft'`, `'pending_approval'`, `'approved'`, `'rejected'`, `'posted'`, `'cancelled'`, `'voided'`
- `payments.status`: `'draft'`, `'pending_approval'`, `'approved'`, `'rejected'`, `'paid'`, `'cancelled'`, `'voided'`
- `payments.pay_method`: `'cash'`, `'cheque'`, `'bank_transfer'`, `'credit_card'`, `'offset'`, `'deposit'`
- `invoices.vat_type`: `'inclusive'`, `'exclusive'`, `'exempt'`, `'none'`
- `deposit_payments.status`: `'active'`, `'applied'`, `'cancelled'`
- `deposit_applications.status`: `'active'`, `'cancelled'`
- IDs are **UUIDs** (string), not integers.

## Patterns

### Server-side data access (preferred)
Service classes in `src/modules/*/` use `createServerClient()` from `@/lib/supabase/server`. These are the canonical data layer.

### Client-side data access
Settings pages and some detail pages use `createClient()` from `@/lib/supabase/client` directly. This is acceptable for simple CRUD but **server actions via Zod-validated schemas are preferred for mutations** (see `vendor.actions.ts`, `posting.actions.ts`, `payment.actions.ts` for the pattern).

### Auth
- `middleware.ts` guards all routes except `/login` and `/auth/callback`
- Checks `app_users.auth_uid = auth.user.id` and `app_users.is_active`
- RLS on all tables uses `is_admin()` / `has_role()` SECURITY DEFINER functions

### Custom errors
`AppError`, `NotFoundError`, `DuplicateError`, `PeriodClosedError`, `ValidationError`, `AuthorizationError` from `@/lib/errors` — use these in services, not raw `Error`.

### Styling
Tailwind CSS with custom utility classes: `card`, `btn-primary`, `btn-outline`, `btn-destructive`, `btn-ghost`, `input-field`, `label-text`, `table-container`, `data-table`, `badge`, `badge-success`, `badge-danger`, `sidebar-link`.

## Current Gaps

- **Print/Export**: No PDF/CSV export on any page
- **Period validation**: Transfer and Deposit services don't check period status before operating
- **Approval Policies**: No amount-based thresholds or multi-level approval
- **Role/Rights management UI**: No UI to manage `role_rights`
- **Invoice Attachments**: No upload UI for `invoice_attachments` table
- **Doc Number config**: Some services hardcode prefix/digits instead of reading from `config` table
- **Tests**: No test suite configured; `npm run build` is the primary verification step