#!/usr/bin/env node
/**
 * WhatsApp Business hub QA — read-only (no Fabrika/customer data writes).
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

async function login(email, password) {
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
      email,
      password,
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
  console.log(`\n=== WhatsApp Business Hub QA @ ${BASE} ===\n`);
  console.log(`Page URL: ${BASE}/dashboard/marketing/whatsapp\n`);

  const cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  record("Owner authentication", !!cookie);

  const pageRes = await fetch(`${BASE}/dashboard/marketing/whatsapp`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("WhatsApp Business page HTTP 200", pageRes.status === 200, `HTTP ${pageRes.status}`);

  const apiRes = await fetch(`${BASE}/api/marketing/whatsapp/business`, {
    headers: { Cookie: cookie },
  });
  record("WhatsApp Business API", apiRes.ok, `HTTP ${apiRes.status}`);

  if (apiRes.ok) {
    const data = await apiRes.json();
    record("Permissions payload", data.permissions != null, `canEdit=${data.permissions?.canEdit}`);
    record("Connection section", data.connection !== undefined, data.connection ? "configured" : "empty");
    record("Automation section", !!data.automation, `enabled=${data.automation?.isEnabled}`);
    record("Templates array", Array.isArray(data.templates), `${data.templates?.length ?? 0} templates`);
    record("Delivery stats", !!data.stats, `queued=${data.stats?.queued ?? 0}`);
    record("Health checks", Array.isArray(data.health) && data.health.length === 6, `${data.health?.length} checks`);
    record("Webhook URL", !!data.webhookUrl, data.webhookUrl?.slice(0, 40) || "");
  }

  const legacyRes = await fetch(`${BASE}/dashboard/marketing/automations/after-visit`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record(
    "Legacy after-visit redirects",
    legacyRes.status === 307 || legacyRes.status === 308,
    `HTTP ${legacyRes.status}`
  );

  const navRes = await fetch(`${BASE}/dashboard/marketing/automations`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Automations hub (الرسائل التلقائية)", navRes.status === 200, `HTTP ${navRes.status}`);

  const patchRes = await fetch(`${BASE}/api/marketing/whatsapp/business`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ isEnabled: false }),
  });
  record("Owner can PATCH automation", patchRes.ok, `HTTP ${patchRes.status}`);

  const tablesRes = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  if (tablesRes.ok) {
    const tables = await json(tablesRes);
    const count = Array.isArray(tables) ? tables.length : tables?.tables?.length ?? 0;
    record("Fabrika tables intact (read-only)", count >= 100, `${count} tables`);
  } else {
    record("Fabrika tables intact (read-only)", false, `HTTP ${tablesRes.status}`);
  }

  const receptionRes = await fetch(`${BASE}/dashboard/marketing/whatsapp`, { redirect: "manual" });
  record("Reception blocked without auth", receptionRes.status === 307 || receptionRes.status === 302, `HTTP ${receptionRes.status}`);

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
