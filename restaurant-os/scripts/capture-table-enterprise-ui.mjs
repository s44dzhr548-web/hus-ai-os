#!/usr/bin/env node
/**
 * Capture Enterprise Table Management UI screenshots (local or production).
 * Usage: node scripts/capture-table-enterprise-ui.mjs [baseUrl]
 */
import { mkdirSync } from "fs";
import { join } from "path";
import { chromium, devices } from "playwright";

const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const OUT_DIR = join(process.cwd(), "tmp", "table-enterprise-screenshots");
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

async function loginViaForm(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 120000 });
}

async function captureViewport(browser, name, device, fn) {
  mkdirSync(OUT_DIR, { recursive: true });
  const ctx = await browser.newContext({ ...device, locale: "ar-SA" });
  const page = await ctx.newPage();
  await loginViaForm(page);
  await page.goto(`${BASE}/dashboard/tables`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector('[data-testid="table-floor-view"], [data-testid="table-stats-bar"]', {
    timeout: 90000,
  });
  if (fn) await fn(page);
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log("Saved:", path);
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  await captureViewport(browser, "prod-01-floor-default", devices["Desktop Chrome"]);

  await captureViewport(browser, "prod-02-grid-view", devices["Desktop Chrome"], async (page) => {
    await page.getByTestId("view-mode-grid").click();
    await page.waitForSelector('[data-testid="table-enterprise-grid"]', { timeout: 30000 });
  });

  await captureViewport(browser, "prod-03-floor-mobile", devices["iPhone 13"]);

  await captureViewport(browser, "prod-04-bulk-toolbar", devices["Desktop Chrome"], async (page) => {
    await page.getByTestId("bulk-mode-toggle").click();
    const firstTable = page.locator('[data-testid="table-floor-view"] button').first();
    if (await firstTable.isVisible()) await firstTable.click();
    await page.waitForSelector('[data-testid="table-bulk-toolbar"]', { timeout: 15000 });
  });

  await browser.close();
  console.log("\nScreenshots saved to", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
