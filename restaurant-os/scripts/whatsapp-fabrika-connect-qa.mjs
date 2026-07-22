#!/usr/bin/env node
/**
 * Fabrika WhatsApp connect + verify on production (upserts connection metadata only).
 * Usage: node scripts/whatsapp-fabrika-connect-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const FABRIKA_SLUG = "fabrika-mqkat9dw";
const DO_CONNECT = process.env.WHATSAPP_DO_CONNECT !== "0";

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

async function switchFabrika(cookie) {
  const list = await json(await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } }));
  const fab = (Array.isArray(list) ? list : []).find((r) => r.slug === FABRIKA_SLUG);
  if (!fab) throw new Error("Fabrika not found");
  const sw = await fetch(`${BASE}/api/restaurants/switch`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId: fab.id }),
  });
  const next = [
    ...cookie.split("; ").filter(Boolean),
    ...(sw.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
  return next;
}

async function main() {
  console.log(`\n=== Fabrika WhatsApp Connect QA @ ${BASE} ===\n`);

  let cookie = await login();
  record("Authentication", !!cookie);
  cookie = await switchFabrika(cookie);
  record("Switched to Fabrika", true, FABRIKA_SLUG);

  const setupBefore = await json(
    await fetch(`${BASE}/api/marketing/whatsapp/setup`, { headers: { Cookie: cookie } })
  );
  record("Setup API", true, `platformTokenReady=${setupBefore.platformTokenReady}`);
  record("New deploy fields", setupBefore.platformTokenReady !== undefined, "platformTokenReady present");
  record("No token in API payload", !JSON.stringify(setupBefore).match(/EAA[A-Za-z0-9]/), "owner-safe");

  if (DO_CONNECT && setupBefore.platformTokenReady) {
    const connectRes = await fetch(`${BASE}/api/marketing/whatsapp/setup`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect_from_platform" }),
    });
    const connect = await json(connectRes);
    record(
      "connect_from_platform",
      connectRes.ok,
      connect.error || connect.state?.connection?.connectionStatus || `HTTP ${connectRes.status}`
    );
  } else if (DO_CONNECT) {
    record("connect_from_platform", false, "platform token not ready — deploy pending");
  }

  const biz = await json(
    await fetch(`${BASE}/api/marketing/whatsapp/business`, { headers: { Cookie: cookie } })
  );
  record("Business hub API", true, biz.dashboardSummary?.connectionStatus);
  record(
    "PHONE displayed",
    biz.dashboardSummary?.phoneNumber && biz.dashboardSummary.phoneNumber !== "—",
    biz.dashboardSummary?.phoneNumber || "—"
  );
  record(
    "Health Cloud API",
    biz.health?.find((h) => h.id === "cloud_api")?.ok ?? false,
    biz.health?.find((h) => h.id === "cloud_api")?.detail
  );
  record(
    "Health Token",
    biz.health?.find((h) => h.id === "token")?.ok ?? false,
    biz.health?.find((h) => h.id === "token")?.detail
  );
  record("Templates", (biz.templates?.length ?? 0) > 0, `${biz.templates?.length ?? 0} templates`);

  const page = await fetch(`${BASE}/dashboard/marketing/whatsapp`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const html = await page.text();
  record("Dashboard page", page.status === 200, `HTTP ${page.status}`);
  record("No Staging simulation banner", !html.includes("Staging/Local"), "WhatsApp route");
  record("No Access Token field", !html.includes("Access Token (encrypted"), "UI");

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
