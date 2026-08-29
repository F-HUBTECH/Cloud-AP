import { expect, test } from "@playwright/test";
import { collectPageErrors } from "../helpers";

const hasCredentials = Boolean(
  process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD,
);

const routes = [
  ["/dashboard", "Dashboard"],
  ["/vendors", "Vendors"],
  ["/postings", "AP Vouchers"],
  ["/payments", "Payments"],
  ["/approvals", "Invoice Approvals"],
  ["/transfers", "Vendor Transfers"],
  ["/bank-reconciliation", "Bank Reconciliation"],
  ["/deposits", "Deposits"],
  ["/deposit-applications", "Deposit Applications"],
  ["/check-account", "Check Account"],
  ["/debit-notes", "Debit Notes"],
  ["/witholding-tax", "Withholding Tax Report"],
  ["/reports", "Reports"],
  ["/reports/aging", "AP Aging Report"],
  ["/reports/vendor-card", "Vendor Card Report"],
  ["/reports/detail-ledger", "Detail Ledger Report"],
  ["/reports/payment-register", "Payment Register"],
  ["/reports/invoice-register", "Invoice Register"],
  ["/reports/vendor-balance", "Vendor Balance Summary"],
] as const;

test.describe("authenticated route smoke tests", () => {
  test.skip(
    !hasCredentials,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated tests",
  );

  for (const [path, heading] of routes) {
    test(`${path} renders ${heading}`, async ({ page }) => {
      const pageErrors = collectPageErrors(page);

      await page.goto(path);

      await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      expect(pageErrors).toEqual([]);
    });
  }

  test("allows the signed-in user to sign out", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("header").getByRole("button").click();
    await page.getByRole("button", { name: "Sign Out" }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
