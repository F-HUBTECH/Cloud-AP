import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

const authFile = resolve("tests/e2e/.auth/user.json");

export default async function globalSetup(config: FullConfig) {
  await mkdir(dirname(authFile), { recursive: true });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    await writeFile(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("E2E_BASE_URL must be a valid URL");
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${baseURL}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await page.context().storageState({ path: authFile });
  } finally {
    await browser.close();
  }
}
