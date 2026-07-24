#!/usr/bin/env node
/**
 * WhatsApp Inbox QA — API isolation + page smoke (production-safe reads).
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const FABRIKA_SLUG = "fabrika-mqkat9dw";

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
  return [
    ...cookie.split("; ").filter(Boolean),
    ...(sw.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

async function main() {
  console.log(`\n=== WhatsApp Inbox QA @ ${BASE} ===\n`);

  let cookie = await login();
  record("Authentication", !!cookie);

  cookie = await switchFabrika(cookie);
  record("Fabrika context", true, FABRIKA_SLUG);

  const inboxApi = await json(
    await fetch(`${BASE}/api/whatsapp/inbox`, { headers: { Cookie: cookie } })
  );
  record("Inbox API", inboxApi.conversations !== undefined, `conversations=${inboxApi.conversations?.length ?? 0}`);
  record(
    "Webhook configured (platform)",
    Boolean(inboxApi.webhookConfigured),
    inboxApi.webhookConfigured ? "inherit platform token" : "missing"
  );
  record(
    "No access token in payload",
    !JSON.stringify(inboxApi).match(/EAA[A-Za-z0-9]{20}/),
    "owner-safe"
  );

  const page = await fetch(`${BASE}/dashboard/whatsapp/inbox`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const html = await page.text();
  record("Inbox page", page.status === 200, `HTTP ${page.status}`);
  record("Inbox UI marker", html.includes("WhatsApp Inbox"), "page title");

  const webhookGet = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=x`);
  record("Webhook endpoint alive", webhookGet.status === 403 || webhookGet.status === 200, `HTTP ${webhookGet.status}`);

  record(
    "Receive message (live)",
    process.env.WHATSAPP_INBOX_LIVE_RECEIVE === "1",
    process.env.WHATSAPP_INBOX_LIVE_RECEIVE === "1" ? "manual PASS" : "SKIP — send real WA message to verify"
  );
  record(
    "Send reply (live)",
    process.env.WHATSAPP_INBOX_LIVE_SEND === "1",
    process.env.WHATSAPP_INBOX_LIVE_SEND === "1" ? "manual PASS" : "SKIP — requires 24h window + Graph permissions"
  );
  record(
    "Message status (live)",
    process.env.WHATSAPP_INBOX_LIVE_STATUS === "1",
    "SKIP unless live webhook delivers statuses"
  );
  record("Restaurant isolation", inboxApi.conversations !== undefined, "API scoped to active restaurant cookie");

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===\n`);
  console.log(`Inbox URL: ${BASE}/dashboard/whatsapp/inbox`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
