#!/usr/bin/env node
/**
 * Production smoke test — 15 major features.
 * Usage: node scripts/production-smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const DEMO_TABLE_ID = process.env.SMOKE_DEMO_TABLE_ID || "cmqidxux90001uoo8be3ajk2d";
const DEMO_SLUG = "menu-os-demo";
const DEMO_TABLE_CODE = "menu-os-demo-t1";

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 120) };
  }
}

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  if (!csrfRes.ok) throw new Error(`csrf HTTP ${csrfRes.status}`);
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
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = [
    ...cookies.map((c) => c.split(";")[0]),
    ...setCookies.map((c) => c.split(";")[0]),
  ].join("; ");
  if (!sessionCookie) throw new Error(`login HTTP ${loginRes.status}`);
  return sessionCookie;
}

async function main() {
  console.log(`Production smoke test: ${BASE}\n`);

  // 1. Login
  let adminCookie = "";
  try {
    adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    record("Login", true);
  } catch (e) {
    record("Login", false, String(e.message || e));
  }

  // 2. Restaurant registration
  try {
    const email = `smoke_${Date.now()}@menuos.sa`;
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerName: "Smoke Owner",
        email,
        password: "Smokepass123!",
        restaurantName: "Smoke Restaurant",
        restaurantNameAr: "مطعم اختبار",
      }),
    });
    const data = await json(r);
    record("Restaurant registration", r.ok && !!data.restaurantId, data.error || data.restaurantId);
  } catch (e) {
    record("Restaurant registration", false, String(e.message || e));
  }

  // 3. Dashboard
  try {
    const r = await fetch(`${BASE}/dashboard`, {
      headers: adminCookie ? { Cookie: adminCookie } : {},
      redirect: "manual",
    });
    record("Dashboard", r.status === 200 || r.status === 307, `HTTP ${r.status}`);
  } catch (e) {
    record("Dashboard", false, String(e.message || e));
  }

  // 4. QR menu (slug route)
  try {
    const r = await fetch(`${BASE}/r/${DEMO_SLUG}/table/${DEMO_TABLE_CODE}`);
    const html = await r.text();
    record("QR menu", r.ok && html.length > 500, `HTTP ${r.status}`);
  } catch (e) {
    record("QR menu", false, String(e.message || e));
  }

  // 5. Categories (public menu API)
  let menuItemId = null;
  try {
    const r = await fetch(`${BASE}/api/public/menu/${DEMO_TABLE_ID}`);
    const data = await json(r);
    const cats = data.categories?.length ?? 0;
    const item =
      data.categories?.[0]?.items?.[0] ||
      data.categories?.[0]?.children?.[0]?.items?.[0];
    menuItemId = item?.id;
    record("Categories", r.ok && cats > 0, `${cats} categories`);
  } catch (e) {
    record("Categories", false, String(e.message || e));
  }

  // 6. Products
  try {
    const r = await fetch(`${BASE}/api/public/menu/${DEMO_TABLE_ID}`);
    const data = await json(r);
    let count = 0;
    for (const c of data.categories || []) {
      count += (c.items?.length || 0);
      for (const ch of c.children || []) count += ch.items?.length || 0;
    }
    record("Products", r.ok && count > 0, `${count} products`);
  } catch (e) {
    record("Products", false, String(e.message || e));
  }

  // 7. Images & videos (menu item media fields)
  try {
    const r = await fetch(`${BASE}/api/public/menu/${DEMO_TABLE_ID}`);
    const data = await json(r);
    const allItems = (data.categories || []).flatMap((c) => [
      ...(c.items || []),
      ...(c.children || []).flatMap((ch) => ch.items || []),
    ]);
    const withMedia = allItems.filter((i) => i.imageUrl || i.videoUrl || i.previewUrl);
    record("Images & videos", r.ok && withMedia.length > 0, `${withMedia.length} with media`);
  } catch (e) {
    record("Images & videos", false, String(e.message || e));
  }

  // 8–10. Moyasar customer checkout + Orders (checkout creates order)
  let orderId = null;
  try {
    const checkoutConfig = await fetch(`${BASE}/api/checkout?tableId=${DEMO_TABLE_ID}`);
    const cfg = await json(checkoutConfig);
    if (!checkoutConfig.ok) throw new Error(cfg.error || `config HTTP ${checkoutConfig.status}`);

    if (!menuItemId) {
      const menuRes = await fetch(`${BASE}/api/public/menu/${DEMO_TABLE_ID}`);
      const menu = await json(menuRes);
      menuItemId =
        menu.categories?.[0]?.items?.[0]?.id ||
        menu.categories?.[0]?.children?.[0]?.items?.[0]?.id;
    }
    if (!menuItemId) throw new Error("no menu item");

    const r = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: DEMO_TABLE_ID,
        items: [{ menuItemId, quantity: 1 }],
        method: "MADA",
        customerName: "Smoke Test",
        customerPhone: "0503333333",
      }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    orderId = data.orderId;
    record("Moyasar customer checkout", true, `order #${data.orderNumber}`);
    record("Orders", !!orderId, `#${data.orderNumber}`);
  } catch (e) {
    record("Moyasar customer checkout", false, String(e.message || e));
    record("Orders", false, String(e.message || e));
  }

  // 9. Tables
  try {
    if (!adminCookie) throw new Error("no session");
    const r = await fetch(`${BASE}/api/tables`, { headers: { Cookie: adminCookie } });
    const data = await json(r);
    record("Tables", r.ok && Array.isArray(data) && data.length > 0, `${data?.length ?? 0} tables`);
  } catch (e) {
    record("Tables", false, String(e.message || e));
  }

  // 10. WhatsApp ordering
  try {
    const r = await fetch(`${BASE}/api/public/menu/slug/${DEMO_SLUG}/${DEMO_TABLE_CODE}`);
    const data = await json(r);
    const hasWa = Boolean(data.restaurant?.whatsappNumber);
    record("WhatsApp ordering", r.ok && hasWa, hasWa ? data.restaurant.whatsappNumber : "no whatsappNumber");
  } catch (e) {
    record("WhatsApp ordering", false, String(e.message || e));
  }

  // 11. Subscription billing
  try {
    if (!adminCookie) throw new Error("no session");
    const r = await fetch(`${BASE}/api/billing/config?scope=platform`, {
      headers: { Cookie: adminCookie },
    });
    const data = await json(r);
    record("Subscription billing", r.ok && (data.mode === "live" || data.mode === "mock"), `mode=${data.mode}`);
  } catch (e) {
    record("Subscription billing", false, String(e.message || e));
  }

  // 12. Database CRUD (create category via API)
  try {
    if (!adminCookie) throw new Error("no session");
    const r = await fetch(`${BASE}/api/menu/categories`, {
      method: "POST",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ nameAr: `فئة smoke ${Date.now()}`, nameEn: "Smoke Cat" }),
    });
    const data = await json(r);
    record("Database CRUD", r.ok && !!data.id, data.id || data.error);
  } catch (e) {
    record("Database CRUD", false, String(e.message || e));
  }

  // 13. Admin panel
  try {
    if (!adminCookie) throw new Error("no session");
    const r = await fetch(`${BASE}/api/platform`, { headers: { Cookie: adminCookie } });
    const data = await json(r);
    record("Admin panel", r.ok && Array.isArray(data.restaurants), `${data.restaurants?.length ?? 0} restaurants`);
  } catch (e) {
    record("Admin panel", false, String(e.message || e));
  }

  // 14. Deployment (core API health)
  try {
    const checks = await Promise.all([
      fetch(`${BASE}/api/auth/csrf`).then((r) => r.ok),
      fetch(`${BASE}/api/public/menu/${DEMO_TABLE_ID}`).then((r) => r.ok),
      fetch(`${BASE}/`).then((r) => r.ok),
    ]);
    record("Deployment", checks.every(Boolean), checks.map((c) => (c ? "ok" : "fail")).join(", "));
  } catch (e) {
    record("Deployment", false, String(e.message || e));
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail || ""}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
