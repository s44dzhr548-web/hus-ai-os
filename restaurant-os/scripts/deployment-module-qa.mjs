#!/usr/bin/env node
/**
 * Post-deploy module verification — all routes HTTP 200 when authenticated.
 * Usage: node scripts/deployment-module-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const DEMO_SLUG = "menu-os-demo";
const DEMO_TABLE_CODE = "menu-os-demo-t1";
const DEMO_TABLE_ID = process.env.SMOKE_DEMO_TABLE_ID || "cmqidxux90001uoo8be3ajk2d";

const MODULES = [
  ["Landing Page", `/r/${DEMO_SLUG}`, false],
  ["Hero Video (landing config API)", `/api/public/restaurants/${DEMO_SLUG}`, false],
  ["Public Menu (QR)", `/r/${DEMO_SLUG}/table/${DEMO_TABLE_CODE}`, false],
  ["Menu API", `/api/public/menu/${DEMO_TABLE_ID}`, false],
  ["Reservations (dashboard)", "/dashboard/reservations", true],
  ["Reception (dashboard)", "/dashboard/reception", true],
  ["Table Management", "/dashboard/tables", true],
  ["Table Gifts (dashboard)", "/dashboard/gifts", true],
  ["Gifts API", "/api/gifts", true],
  ["Staff Audit", "/dashboard/staff/audit", true],
  ["Staff Activity", "/dashboard/staff/activity", true],
  ["Customer Visit Tracking", "/dashboard/customers?tab=visits", true],
  ["Visit Tracking API", "/api/staff-activity?scope=audit", true],
  ["Media Center", "/dashboard/media", true],
  ["After-Visit WhatsApp", "/dashboard/marketing/whatsapp", true],
  ["Public Gifts API", "/api/public/gifts?tableId=" + DEMO_TABLE_ID, false],
];

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
}

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

async function main() {
  console.log(`\n=== Deployment Module QA @ ${BASE} ===\n`);
  let cookie = "";
  try {
    cookie = await login();
    record("Authentication", !!cookie, cookie ? "session ok" : "no cookie");
  } catch (e) {
    record("Authentication", false, e.message);
    process.exit(1);
  }

  for (const [name, path, auth] of MODULES) {
    const headers = auth ? { Cookie: cookie } : {};
    const r = await fetch(`${BASE}${path}`, { headers, redirect: auth ? "manual" : "follow" });
    const ok = r.status === 200;
    record(name, ok, `HTTP ${r.status}`);
  }

  // Hero video content check
  const brandingRes = await fetch(`${BASE}/api/public/restaurants/${DEMO_SLUG}`);
  if (brandingRes.ok) {
    const data = await json(brandingRes);
    const hasVideo =
      !!data?.landingPageConfig?.heroVideoUrl ||
      !!data?.branding?.heroVideoUrl ||
      !!data?.homepageSections?.some?.((s) => s.type === "video");
    record("Hero Video content present", hasVideo, hasVideo ? "video configured" : "no video field");
  } else {
    record("Hero Video content present", false, `HTTP ${brandingRes.status}`);
  }

  // Fabrika data safety (read-only counts)
  const tablesRes = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  if (tablesRes.ok) {
    const tables = await json(tablesRes);
    const count = Array.isArray(tables) ? tables.length : tables?.tables?.length ?? 0;
    record("Fabrika tables intact", count >= 100, `${count} tables`);
  } else {
    record("Fabrika tables intact", false, `HTTP ${tablesRes.status}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  if (failed.length) {
    console.log("\nFailed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
