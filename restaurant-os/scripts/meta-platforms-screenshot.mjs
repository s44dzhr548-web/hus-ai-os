#!/usr/bin/env node
/**
 * Screenshot Meta Ads platform card after login.
 * Usage: node scripts/meta-platforms-screenshot.mjs [baseUrl] [outPath]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const OUT = process.argv[3] || "tmp/meta-platforms-card.png";

async function json(res) {
  return res.json().catch(() => ({}));
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: process.env.QA_ADMIN_EMAIL || "admin@menuos.sa",
      password: process.env.QA_ADMIN_PASSWORD || "admin123456",
      callbackUrl: `${BASE}/dashboard/marketing/platforms`,
      json: "true",
    }),
    redirect: "manual",
  });
  return [
    ...cookies.map((c) => c.split(";")[0]),
    ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

async function switchFabrika(cookie) {
  const list = await json(await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } }));
  const fab = (Array.isArray(list) ? list : []).find((r) => r.slug === "fabrika-mqkat9dw");
  if (!fab) throw new Error("Fabrika not found");
  const sw = await fetch(`${BASE}/api/restaurants/switch`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId: fab.id }),
  });
  return [
    ...cookie.split("; ").filter(Boolean),
    ...(sw.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "ar-SA",
  });
  const page = await context.newPage();

  let cookie = await login();
  cookie = await switchFabrika(cookie);

  const parsed = cookie.split("; ").filter(Boolean).map((pair) => {
    const idx = pair.indexOf("=");
    return { name: pair.slice(0, idx), value: pair.slice(idx + 1), url: BASE };
  });
  await context.addCookies(parsed);

  await page.goto(`${BASE}/dashboard/marketing/platforms`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="meta-ads-connect-button"]', { timeout: 30000 });

  const metaCard = page.locator('[data-testid="meta-ads-connect-button"]').locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
  await mkdir(dirname(OUT), { recursive: true });
  await metaCard.screenshot({ path: OUT });

  const html = await page.content();
  const hasButton = html.includes("ربط حساب Meta Ads");
  const href = await page.locator('[data-testid="meta-ads-connect-button"]').getAttribute("href");

  await browser.close();

  console.log(`Screenshot: ${OUT}`);
  console.log(`Button in DOM: ${hasButton ? "yes" : "no"}`);
  console.log(`Button href: ${href || "(disabled span)"}`);
  process.exit(hasButton ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
