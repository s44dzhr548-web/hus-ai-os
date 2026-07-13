#!/usr/bin/env node
/**
 * Table Management module tests (production-safe read + permission checks).
 * Usage: node scripts/table-management-test.mjs [baseUrl]
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
  console.log(`Table Management test: ${BASE}\n`);
  const cookie = await login();
  record("Authentication", !!cookie);

  const headers = { Cookie: cookie };

  const permRes = await fetch(`${BASE}/api/tables/management`, { headers });
  const perm = await json(permRes);
  record("Permissions API", permRes.status === 200);
  record("Owner can manage tables", perm.canManage === true || perm.isOwner === true);

  const listRes = await fetch(`${BASE}/api/tables`, { headers });
  const list = await json(listRes);
  record("Tables list API", listRes.status === 200, `count=${Array.isArray(list) ? list.length : list.tables?.length ?? 0}`);

  const pageRes = await fetch(`${BASE}/dashboard/tables`, { headers });
  record("Tables management page", pageRes.status === 200);

  const fabrikaRes = await fetch(`${BASE}/api/reception`, { headers });
  record("Fabrika reception intact", fabrikaRes.status === 200);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
  console.log("No Fabrika data modified — read-only permission checks.");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
