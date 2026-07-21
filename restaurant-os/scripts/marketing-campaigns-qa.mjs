#!/usr/bin/env node
/**
 * Marketing campaigns page + API QA (read-only — no Fabrika writes).
 * Usage: node scripts/marketing-campaigns-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

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
      callbackUrl: `${BASE}/dashboard/marketing/campaigns`,
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
  console.log(`Marketing campaigns QA: ${BASE}\n`);
  let cookie = "";
  try {
    cookie = await login();
    record("Login", !!cookie);
  } catch (e) {
    record("Login", false, e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const apiRes = await fetch(`${BASE}/api/marketing/campaigns`, {
    headers: { Cookie: cookie },
  });
  const apiData = await json(apiRes);
  const apiOk = apiRes.ok && Array.isArray(apiData.campaigns);
  record(
    "GET /api/marketing/campaigns",
    apiOk,
    apiOk ? `${apiData.campaigns.length} campaigns` : `status ${apiRes.status} ${apiData.error || ""}`
  );

  const pageRes = await fetch(`${BASE}/dashboard/marketing/campaigns`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record(
    "GET /dashboard/marketing/campaigns",
    pageRes.status === 200,
    `status ${pageRes.status}`
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
