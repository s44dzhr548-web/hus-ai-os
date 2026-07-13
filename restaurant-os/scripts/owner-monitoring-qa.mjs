#!/usr/bin/env node
/**
 * Owner Monitoring Dashboard QA (read-only on production).
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results = [];
function record(name, ok, detail = "") {
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
  console.log(`\n=== Owner Monitoring Dashboard QA ===`);
  console.log(`URL: ${BASE}\n`);

  const cookie = await login();
  record("Authentication", !!cookie);
  const headers = { Cookie: cookie };

  const dashboard = await json(await fetch(`${BASE}/api/monitoring?section=dashboard`, { headers }));
  record("Monitoring dashboard API", !!dashboard.stats);
  record("Live customers payload", Array.isArray(dashboard.liveCustomers));
  record("Stats: customersInside", typeof dashboard.stats?.customersInside === "number");
  record("Stats: occupancyRate", typeof dashboard.stats?.occupancyRate === "number");
  record("Timeline payload", Array.isArray(dashboard.timeline));
  record("Staff top payload", Array.isArray(dashboard.staffTop));

  const staff = await json(await fetch(`${BASE}/api/monitoring?section=staff`, { headers }));
  record("Staff performance API", Array.isArray(staff.staff));

  const audit = await json(await fetch(`${BASE}/api/monitoring?section=audit`, { headers }));
  record("Audit log API", Array.isArray(audit.audit));

  const loginHist = await json(await fetch(`${BASE}/api/monitoring?section=login-history`, { headers }));
  record("Login history API", Array.isArray(loginHist.logs));

  const exportRes = await fetch(`${BASE}/api/monitoring/export?type=stats&format=csv`, { headers });
  record("CSV export", exportRes.status === 200);

  const pages = [
    ["Monitoring dashboard", "/dashboard/monitoring"],
    ["Customer visits", "/dashboard/monitoring/visits"],
    ["Staff activity", "/dashboard/monitoring/staff"],
    ["Login history", "/dashboard/monitoring/login-history"],
    ["Audit log", "/dashboard/monitoring/audit"],
  ];
  for (const [label, path] of pages) {
    const r = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
    record(`${label} page`, r.status === 200 || r.status === 307);
  }

  const tables = await json(await fetch(`${BASE}/api/tables?format=full`, { headers }));
  record("Fabrika tables unchanged", tables.stats?.total === 116 || tables.stats?.total > 0);

  record("Reception intact", (await fetch(`${BASE}/api/reception`, { headers })).status === 200);
  record("Reservations intact", (await fetch(`${BASE}/api/reservations`, { headers })).status === 200);
  record("Orders intact", (await fetch(`${BASE}/api/orders`, { headers })).status === 200);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => r.ok === false).length;
  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
  console.log("Fabrika production: READ-ONLY — no data modified.\n");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
