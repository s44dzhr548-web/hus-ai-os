#!/usr/bin/env node
/**
 * Fabrika / live customer regression — verifies core workflows unchanged.
 * Usage: node scripts/fabrika-regression-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const CORE_PATHS = [
  ["Reception", "/dashboard/reception"],
  ["Reservations", "/dashboard/reservations"],
  ["Customers", "/dashboard/customers"],
  ["Tables", "/dashboard/tables"],
  ["Monitoring", "/dashboard/monitoring"],
  ["Orders", "/dashboard/orders"],
  ["Kitchen", "/dashboard/kitchen"],
  ["Branding", "/dashboard/branding"],
  ["Media Center", "/dashboard/media"],
  ["Staff", "/dashboard/staff"],
  ["Settings", "/dashboard/settings"],
  ["Menu", "/dashboard/menu"],
];

const CORE_APIS = [
  ["Reception API", "/api/reception"],
  ["Reservations API", "/api/reservations"],
  ["Tables API", "/api/tables"],
  ["Orders API", "/api/orders"],
  ["Branding API", "/api/restaurants/branding"],
];

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
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
  console.log(`Fabrika regression test: ${BASE}\n`);
  let cookie = "";
  try {
    cookie = await login();
    record("Login", !!cookie);
  } catch (e) {
    record("Login", false, String(e.message));
    process.exit(1);
  }

  for (const [name, path] of CORE_PATHS) {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    record(name, [200, 307, 308].includes(r.status), `HTTP ${r.status}`);
  }

  for (const [name, path] of CORE_APIS) {
    const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
    record(name, r.ok, `HTTP ${r.status}`);
  }

  const pub = await fetch(`${BASE}/r/menu-os-demo/table/menu-os-demo-t1`);
  record("Public QR Menu", pub.ok, `HTTP ${pub.status}`);

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
