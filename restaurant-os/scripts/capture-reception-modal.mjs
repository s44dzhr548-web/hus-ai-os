/**
 * Capture production reception walk-in modal screenshot.
 * Usage: node scripts/capture-reception-modal.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";

const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const OUT = "reception-modal-production.png";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    ...devices["iPhone 13"],
    locale: "ar-SA",
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@menuos.sa");
  await page.fill('input[type="password"]', "admin123456");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 60000 });

  await page.goto(`${BASE}/dashboard/reception`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "تسجيل عميل جديد" }).click();
  await page.waitForSelector('[data-testid="manual-table-number"]', { timeout: 15000 });
  await page.fill('[data-testid="manual-table-number"]', "VIP-01");

  const modal = page.locator('[data-testid="walk-in-form"]');
  await modal.screenshot({ path: OUT });
  console.log("Saved:", OUT);

  const visible = await page.locator('[data-testid="manual-table-number"]').isVisible();
  const picker = await page.locator('[data-testid="pick-existing-table-btn"]').isVisible();
  console.log("manual-table-number visible:", visible);
  console.log("pick-existing-table-btn visible:", picker);

  await browser.close();
  process.exit(visible && picker ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
