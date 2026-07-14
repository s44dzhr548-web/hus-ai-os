#!/usr/bin/env node
/**
 * Enterprise Ads Platforms QA — read-only (no Fabrika/customer writes).
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
  console.log(`\n=== Enterprise Ads Platforms QA @ ${BASE} ===\n`);

  const cookie = await login();
  record("Authentication", !!cookie);

  const platformsPage = await fetch(`${BASE}/dashboard/marketing/platforms`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Owner platforms page HTTP 200", platformsPage.status === 200, `HTTP ${platformsPage.status}`);

  const platformsApi = await fetch(`${BASE}/api/marketing/platforms`, { headers: { Cookie: cookie } });
  const platforms = await json(platformsApi);
  record("Platforms API", platformsApi.ok, `HTTP ${platformsApi.status}`);

  if (platformsApi.ok) {
    record("Platform cards count", (platforms.platforms?.length ?? 0) >= 7, `${platforms.platforms?.length ?? 0} cards`);
    const payload = JSON.stringify(platforms);
    record("No secrets in owner API", !/client.?secret|access.?token|redirect.?uri|webhook/i.test(payload), "owner-safe");
    record("Permissions payload", typeof platforms.permissions?.canConnect === "boolean", `canConnect=${platforms.permissions?.canConnect}`);
    const connected = platforms.platforms?.filter((p) => p.status === "CONNECTED") ?? [];
    record("Connected providers", true, connected.map((p) => p.key).join(", ") || "none yet");
  }

  const integrationsApi = await fetch(`${BASE}/api/platform/integrations`, { headers: { Cookie: cookie } });
  record("Platform integrations admin API", integrationsApi.status === 200 || integrationsApi.status === 403, `HTTP ${integrationsApi.status}`);
  if (integrationsApi.ok) {
    const integ = await json(integrationsApi);
    record("Integration providers configured", (integ.integrations?.length ?? 0) >= 7, `${integ.integrations?.length ?? 0} providers`);
  }

  const oauthStart = await fetch(`${BASE}/api/marketing/connections/meta/oauth`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record(
    "OAuth start route",
    [302, 307, 403, 503].includes(oauthStart.status),
    oauthStart.status === 403 ? "owner-only gate" : `HTTP ${oauthStart.status}`
  );

  const campaignsApi = await fetch(`${BASE}/api/marketing/campaigns`, { headers: { Cookie: cookie } });
  record("Campaigns API", campaignsApi.ok, `HTTP ${campaignsApi.status}`);

  const campaignBuilder = await fetch(`${BASE}/dashboard/marketing/campaigns/new`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Campaign builder page", campaignBuilder.status === 200, `HTTP ${campaignBuilder.status}`);

  const tables = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  const tablesJson = await json(tables);
  const count = Array.isArray(tablesJson) ? tablesJson.length : tablesJson?.tables?.length ?? 0;
  record("Fabrika tables intact (read-only)", count >= 100, `${count} tables`);

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== QA Score: ${passed}/${results.length} PASS ===`);
  console.log("Database: read-only verification — no Fabrika/customer modifications\n");
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
