import { expect, test } from "@playwright/test";

test.describe("real invoice to payment workflow", () => {
  test("creates, approves, and pays an invoice through the UI", async ({ page, browser }) => {
    test.setTimeout(120_000);
    test.skip(
      !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
      "Set E2E_USER_EMAIL and E2E_USER_PASSWORD for the workflow",
    );
    const suffix = Date.now();
    const invoiceNumber = `E2E-${suffix}`;
    const today = new Date().toISOString().slice(0, 10);

    await page.goto("/postings/new");
    const vendor = page.locator("#supplier_id option").nth(1);
    await expect(vendor).toBeAttached();
    await page.locator("#supplier_id").selectOption({ index: 1 });
    await page.locator("#inv_number").fill(invoiceNumber);
    await page.locator("#inv_date").fill(today);

    await page.getByRole("button", { name: "Next", exact: true }).click();
    const line = page.locator("tbody tr").first();
    await line.getByPlaceholder("GL Account").fill("6100");
    await line.getByPlaceholder("Description").fill(`E2E invoice ${suffix}`);
    await line.locator('input[type="number"]').nth(0).fill("100");

    await page.getByRole("button", { name: "Add Line" }).click();
    const offsetLine = page.locator("tbody tr").nth(1);
    await offsetLine.getByPlaceholder("GL Account").fill("2100");
    await offsetLine.getByPlaceholder("Description").fill(`E2E AP offset ${suffix}`);
    await offsetLine.locator('input[type="number"]').nth(1).fill("100");

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Create Voucher" }).click();
    await page.waitForURL(/\/postings\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(page.getByText(`Inv. ${invoiceNumber}`)).toBeVisible();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Submit for Approval" }).click();
    const submitButton = page.getByRole("dialog").getByRole("button", { name: "Submit", exact: true });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await submitButton.click({ force: true });
    await expect(page.getByText("pending approval", { exact: true })).toBeVisible();
    const invoiceUrl = page.url();

    const approverContext = await browser.newContext({
      baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
      storageState: "tests/e2e/.auth/user.json",
    });
    const approverPage = await approverContext.newPage();
    try {
      await approverPage.goto("/approvals");
      const invoicePath = new URL(invoiceUrl).pathname;
      const approvalRow = approverPage.locator("tbody tr").filter({
        has: approverPage.locator(`a[href="${invoicePath}"]`),
      });
      await expect(approvalRow).toBeVisible();
      await approvalRow.getByRole("button", { name: "Approve" }).click();
      await approverPage.getByRole("dialog").getByRole("button", { name: "Approve", exact: true }).click();
      await expect(approvalRow).toHaveCount(0);

      await page.goto(invoiceUrl);
      await page.reload();
      await expect(page.getByText("approved", { exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Create Payment" }).click();

      const invoiceRow = page.locator("tbody tr").filter({ hasText: invoiceNumber });
      await expect(invoiceRow).toBeVisible();
      await page.locator("#pay_method").selectOption("cash");
      await page.locator("#remark").fill(`E2E payment ${suffix}`);
      const invoiceCheckbox = invoiceRow.locator('input[type="checkbox"]');
      await invoiceCheckbox.click();
      await expect(invoiceCheckbox).toBeChecked();
      await page.getByRole("button", { name: "Create Payment" }).click();
      await page.waitForURL(/\/payments\/[0-9a-f-]+$/, { timeout: 15_000 });
      await expect(page.getByText("draft", { exact: true })).toBeVisible();
      const paymentUrl = page.url();

      await approverPage.goto(paymentUrl);
      await approverPage.getByRole("button", { name: "Approve Payment" }).click();
      await approverPage.getByRole("dialog").getByRole("button", { name: "Yes, approve" }).click();
      await expect(approverPage.getByText("approved", { exact: true })).toBeVisible();

      await page.goto(paymentUrl);
      await page.getByRole("button", { name: "Mark as Paid" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Yes, mark as paid" }).click();
      await expect(page.getByText("paid", { exact: true })).toBeVisible();
    } finally {
      await approverContext.close();
    }
  });
});
