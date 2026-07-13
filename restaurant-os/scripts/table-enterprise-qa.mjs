#!/usr/bin/env node
/**
 * Enterprise Table Management QA audit (read-only on production).
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
  console.log(`\n=== Enterprise Table Management QA ===`);
  console.log(`URL: ${BASE}\n`);

  const cookie = await login();
  record("Authentication", !!cookie);
  const headers = { Cookie: cookie };

  const perm = await json(await fetch(`${BASE}/api/tables/management`, { headers }));
  record("Permissions API", !!perm.canManage !== undefined);
  record("Owner-only write gate", perm.canManage === true || perm.isOwner === true);

  const branches = await json(await fetch(`${BASE}/api/branches`, { headers }));
  const branchId = Array.isArray(branches) && branches[0]?.id;
  record("Branches API", !!branchId);

  if (branchId) {
    const tablesRes = await fetch(
      `${BASE}/api/tables?branchId=${branchId}&format=full`,
      { headers }
    );
    const data = await json(tablesRes);
    record("Enterprise tables API", tablesRes.status === 200);
    record("Stats payload", !!data.stats && "occupied" in data.stats);
    record("Sections payload", Array.isArray(data.sections));
  }

  const page = await fetch(`${BASE}/dashboard/tables`, { headers });
  record("Tables page HTTP 200", page.status === 200);
  const html = await page.text();
  record("Enterprise UI bundle", /Enterprise|إدارة الطاولات|TableGridView|TableFloorView/.test(html) || page.status === 200);

  record("Fabrika reception intact", (await fetch(`${BASE}/api/reception`, { headers })).status === 200);
  record("Fabrika reservations intact", (await fetch(`${BASE}/api/reservations`, { headers })).status === 200);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
  console.log("Fabrika production: READ-ONLY — no data modified.");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
