#!/usr/bin/env node
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

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
  let cookie = await login();
  cookie = await switchFabrika(cookie);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await context.addCookies(
    cookie
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf("=");
        return { name: pair.slice(0, i), value: pair.slice(i + 1), url: BASE };
      })
  );

  await page.goto(`${BASE}/dashboard/marketing/platforms`, { waitUntil: "networkidle" });

  const result = await page.evaluate(() => {
    const node = document.querySelector('[data-testid="meta-ads-connect-button"]');
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      tagName: node.tagName,
      href: node.getAttribute("href"),
      text: node.textContent?.trim(),
      visible: rect.width > 0 && rect.height > 0,
      width: rect.width,
      height: rect.height,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result ? 0 : 1);
}

main();
