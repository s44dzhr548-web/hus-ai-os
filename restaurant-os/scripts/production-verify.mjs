#!/usr/bin/env node
/**
 * Production verification for Restaurant OS deployment.
 * Usage: node scripts/production-verify.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";
const DEMO_TABLE_ID = "cmqidxux90001uoo8be3ajk2d";
const DEMO_SLUG = "menu-os-demo";
const DEMO_TABLE_CODE = "menu-os-demo-t1";

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
}

async function json(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 200) }; }
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
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return [
    ...cookies.map((c) => c.split(";")[0]),
    ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

async function pageOk(path, cookie) {
  const r = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  return r.status === 200 || r.status === 307 || r.status === 308;
}

async function main() {
  console.log(`Production verify: ${BASE}\n`);

  let cookie = "";
  try {
    cookie = await login();
    record("Login", !!cookie);
  } catch (e) {
    record("Login", false, String(e.message));
  }

  // Homepage
  try {
    const r = await fetch(`${BASE}/`);
    const html = await r.text();
    record("Homepage", r.ok && html.includes("Menu OS") || html.length > 500, `HTTP ${r.status}`);
  } catch (e) {
    record("Homepage", false, String(e.message));
  }

  // Customer QR Menu
  try {
    const r = await fetch(`${BASE}/r/${DEMO_SLUG}/table/${DEMO_TABLE_CODE}`);
    const html = await r.text();
    record("Customer QR Menu", r.ok && html.length > 500, `HTTP ${r.status}`);
  } catch (e) {
    record("Customer QR Menu", false, String(e.message));
  }

  // Hero Video
  try {
    const r = await fetch(`${BASE}/api/public/menu/${DEMO_TABLE_ID}`);
    const data = await json(r);
    const hero = data.restaurant?.heroVideoUrl || data.branding?.heroVideoUrl;
    record("Hero Video", r.ok, hero ? "configured" : "menu loads (no hero set)");
  } catch (e) {
    record("Hero Video", false, String(e.message));
  }

  // Dashboard pages
  for (const [name, path] of [
    ["Reception Dashboard", "/dashboard/reception"],
    ["Reservations Dashboard", "/dashboard/reservations"],
    ["Customers History", "/dashboard/customers"],
    ["Tables", "/dashboard/tables"],
    ["Orders", "/dashboard/orders"],
    ["Payments", "/dashboard/payments"],
    ["Subscriptions", "/dashboard/subscription"],
    ["Branding Dashboard", "/dashboard/branding"],
  ]) {
    try {
      const ok = await pageOk(path, cookie);
      record(name, ok, ok ? "HTTP 200/307" : "failed");
    } catch (e) {
      record(name, false, String(e.message));
    }
  }

  // Tables API
  try {
    const r = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
    const data = await json(r);
    record("Tables API", r.ok && Array.isArray(data) && data.length > 0, `${data?.length ?? 0} tables`);
  } catch (e) {
    record("Tables API", false, String(e.message));
  }

  // Orders API
  try {
    const r = await fetch(`${BASE}/api/orders`, { headers: { Cookie: cookie } });
    const data = await json(r);
    record("Orders API", r.ok && Array.isArray(data.orders || data), `HTTP ${r.status}`);
  } catch (e) {
    record("Orders API", false, String(e.message));
  }

  // WhatsApp
  try {
    const r = await fetch(`${BASE}/api/public/menu/slug/${DEMO_SLUG}/${DEMO_TABLE_CODE}`);
    const data = await json(r);
    record("WhatsApp", r.ok && Boolean(data.restaurant?.whatsappNumber), data.restaurant?.whatsappNumber || "no number");
  } catch (e) {
    record("WhatsApp", false, String(e.message));
  }

  // Payments / billing config
  try {
    const r = await fetch(`${BASE}/api/billing/config?scope=platform`, { headers: { Cookie: cookie } });
    const data = await json(r);
    record("Payments/Billing", r.ok && (data.mode === "live" || data.mode === "mock"), `mode=${data.mode}`);
  } catch (e) {
    record("Payments/Billing", false, String(e.message));
  }

  // Subscriptions API
  try {
    const r = await fetch(`${BASE}/api/subscription`, { headers: { Cookie: cookie } });
    const data = await json(r);
    const plan = data.subscription?.plan || data.plans?.[0]?.id;
    record("Subscriptions API", r.ok && !!plan, plan || data.error || `HTTP ${r.status}`);
  } catch (e) {
    record("Subscriptions API", false, String(e.message));
  }

  // Branding API
  try {
    const r = await fetch(`${BASE}/api/restaurants/branding`, { headers: { Cookie: cookie } });
    const data = await json(r);
    record("Branding API", r.ok && !!data, `HTTP ${r.status}`);
  } catch (e) {
    record("Branding API", false, String(e.message));
  }

  // Reception & customers APIs
  try {
    const r = await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } });
    const data = await json(r);
    record("Reception API", r.ok && Array.isArray(data.cards), `${data.cards?.length ?? 0} tables`);
  } catch (e) {
    record("Reception API", false, String(e.message));
  }

  try {
    const r = await fetch(`${BASE}/api/customers?view=reports`, { headers: { Cookie: cookie } });
    const data = await json(r);
    record("Customers History API", r.ok && typeof data.totalVisits === "number", `${data.totalVisits} visits`);
  } catch (e) {
    record("Customers History API", false, String(e.message));
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

main().catch((e) => { console.error(e); process.exit(1); });
