#!/usr/bin/env node
/**
 * Screenshot static enterprise UI preview (works offline / without DB).
 */
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium, devices } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dirname, "table-enterprise-preview.html");
const OUT_DIR = join(__dirname, "..", "tmp", "table-enterprise-screenshots");
const FILE_URL = `file:///${HTML.replace(/\\/g, "/")}`;

async function shot(browser, name, device) {
  mkdirSync(OUT_DIR, { recursive: true });
  const ctx = await browser.newContext({ ...device, locale: "ar-SA" });
  const page = await ctx.newPage();
  await page.goto(FILE_URL, { waitUntil: "load" });
  await page.waitForSelector('[data-testid="table-floor-view"]');
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log("Saved:", path);
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  await shot(browser, "01-floor-desktop-default", devices["Desktop Chrome"]);
  await shot(browser, "03-floor-mobile", devices["iPhone 13"]);
  await browser.close();
  console.log("\nDone:", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
