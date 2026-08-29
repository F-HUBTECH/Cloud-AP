# KSAP Playwright E2E tests

The suite is intentionally read-only for business data. Public authentication and
route-guard tests run without credentials. Authenticated smoke tests require a
dedicated active test user.

## Setup

```bash
cp .env.e2e.example .env.e2e.local
npx playwright install chromium
npm run test:e2e
```

Set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in `.env.e2e.local`. Never use a
production administrator account. Playwright starts the Next.js development server
automatically unless one is already running at `E2E_BASE_URL`.

## Test matrix

| Priority | Area | Coverage |
| --- | --- | --- |
| Critical | Authentication | Login UI, anonymous redirect, invalid login, configured-user login |
| Critical | Protected routes | Dashboard, vendors, vouchers, payments |
| High | Finance routes | Transfers, reconciliation, deposits, deposit applications, account check, debit notes, WHT |
| High | Reports | Report index and six report pages |
| Normal | Mutating workflows | Deferred until isolated E2E seed data and cleanup are available |

Useful commands:

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```
