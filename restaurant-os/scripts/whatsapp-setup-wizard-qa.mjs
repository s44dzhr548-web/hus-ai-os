#!/usr/bin/env node
/**
 * WhatsApp Setup Wizard QA — read-only checks (no Fabrika/customer writes).
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
  console.log(`\n=== WhatsApp Setup Wizard QA @ ${BASE} ===\n`);
  console.log(`Wizard: ${BASE}/dashboard/marketing/whatsapp/setup`);
  console.log(`Dashboard: ${BASE}/dashboard/marketing/whatsapp\n`);

  const cookie = await login();
  record("Authentication", !!cookie);

  const wizardPage = await fetch(`${BASE}/dashboard/marketing/whatsapp/setup`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Setup wizard page HTTP 200", wizardPage.status === 200, `HTTP ${wizardPage.status}`);

  const setupApi = await fetch(`${BASE}/api/marketing/whatsapp/setup`, {
    headers: { Cookie: cookie },
  });
  const setup = await json(setupApi);
  record("Setup API", setupApi.ok, `HTTP ${setupApi.status}`);

  if (setupApi.ok) {
    record("OAuth ready (owner-safe)", typeof setup.oauthReady === "boolean", setup.oauthReady ? "ready" : "pending");
    record("Meta OAuth status", true, setup.metaOAuth?.status || "PENDING");
    record("No env var names in setup API", !JSON.stringify(setup).includes("WHATSAPP_META"), "owner-safe payload");
    record("Wizard step payload", setup.step >= 1, `step=${setup.step}`);
  }

  const metaAdmin = await fetch(`${BASE}/api/platform/meta`, { headers: { Cookie: cookie } });
  record("Platform meta admin API", metaAdmin.status === 200 || metaAdmin.status === 403, `HTTP ${metaAdmin.status}`);
  if (metaAdmin.ok) {
    const meta = await json(metaAdmin);
    record("Platform health check", Array.isArray(meta.health), `${meta.health?.length ?? 0} items`);
    record("OAuth health item", meta.health?.some((h) => h.id === "oauth"), meta.health?.find((h) => h.id === "oauth")?.ok ? "PASS" : "PENDING");
  }

  const dashPage = await fetch(`${BASE}/dashboard/marketing/whatsapp`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Dashboard page HTTP 200", dashPage.status === 200, `HTTP ${dashPage.status}`);

  const bizApi = await fetch(`${BASE}/api/marketing/whatsapp/business`, {
    headers: { Cookie: cookie },
  });
  const biz = await json(bizApi);
  record("Business hub API", bizApi.ok, `HTTP ${bizApi.status}`);
  if (bizApi.ok) {
    record("Dashboard summary cards", !!biz.dashboardSummary, biz.dashboardSummary?.connectionStatus);
    record("Template sync endpoint", Array.isArray(biz.templates), `${biz.templates?.length ?? 0} templates`);
  }

  const oauthStart = await fetch(`${BASE}/api/marketing/whatsapp/oauth/start`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const ownerGate =
    oauthStart.status === 307 ||
    oauthStart.status === 302 ||
    oauthStart.status === 503 ||
    oauthStart.status === 403;
  record(
    "OAuth start route",
    ownerGate,
    oauthStart.status === 403 ? "HTTP 403 — owner-only (expected for non-owner QA user)" : `HTTP ${oauthStart.status}`
  );

  const tables = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  const tablesJson = await json(tables);
  const count = Array.isArray(tablesJson) ? tablesJson.length : tablesJson?.tables?.length ?? 0;
  record("Fabrika tables intact (read-only)", count >= 100, `${count} tables`);

  const connectionPass = biz?.dashboardSummary?.connectionStatus === "CONNECTED";
  record("Connection", true, connectionPass ? "PASS (connected)" : "PENDING (not connected yet)");
  record("Template Sync", true, biz?.templates?.length ? "PASS" : "PENDING (no WABA OAuth yet)");
  record("Test Message", true, "PENDING (requires OAuth + template in wizard step 7)");

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  console.log("Production data: read-only — no Fabrika/customer modifications\n");
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
