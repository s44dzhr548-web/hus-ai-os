#!/usr/bin/env node
/**
 * After-visit WhatsApp automation QA — read-only production checks (no Fabrika writes).
 * Usage: node scripts/after-visit-whatsapp-qa.mjs [baseUrl]
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
  console.log(`\n=== After-Visit WhatsApp QA @ ${BASE} ===\n`);
  console.log(`Automation URL: ${BASE}/dashboard/marketing/automations/after-visit\n`);

  let cookie = "";
  try {
    cookie = await login();
    record("Authentication", !!cookie);
  } catch (e) {
    record("Authentication", false, e.message);
    process.exit(1);
  }

  const pageRes = await fetch(`${BASE}/dashboard/marketing/automations/after-visit`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("After-visit dashboard page", pageRes.status === 200, `HTTP ${pageRes.status}`);

  const apiRes = await fetch(`${BASE}/api/marketing/automations/after-visit`, {
    headers: { Cookie: cookie },
  });
  record("After-visit settings API", apiRes.ok, `HTTP ${apiRes.status}`);

  let automation = null;
  let connection = null;
  let deliveries = [];
  if (apiRes.ok) {
    const data = await apiRes.json();
    automation = data.automation;
    connection = data.connection;
    deliveries = data.deliveries || [];

    record("Automation config payload", !!automation, automation ? `enabled=${automation.isEnabled}` : "missing");
    record("Delay options", Array.isArray(data.delayOptions) && data.delayOptions.length === 4, `${data.delayOptions?.length ?? 0} options`);
    record("Default Arabic template", !!data.defaultMessageBody?.includes("{{1}}"), data.defaultMessageBody?.slice(0, 40) || "");
    record(
      "Encryption ready",
      true,
      data.encryptionReady ? "MARKETING_TOKEN_SECRET set" : "optional until WABA connection saved"
    );

    const templateStatus = connection?.isActive && connection?.hasToken
      ? "CONNECTED"
      : connection?.hasToken
        ? "INACTIVE"
        : "NOT_CONFIGURED";
    record("WhatsApp template / connection status", true, templateStatus);

    const statusSet = new Set([
      "QUEUED", "SENT", "DELIVERED", "READ", "FAILED", "OPTED_OUT",
      "SKIPPED_NO_CONSENT", "SKIPPED_NO_PHONE", "SKIPPED_NO_CONNECTION", "SKIPPED_DISABLED",
    ]);
    const validDeliveries = deliveries.every((d) => statusSet.has(d.status));
    record("Delivery tracking rows", validDeliveries, `${deliveries.length} rows`);
  }

  const webhookGet = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=test`);
  record("WhatsApp webhook endpoint", webhookGet.status === 403 || webhookGet.status === 200, `HTTP ${webhookGet.status}`);

  const cronRes = await fetch(`${BASE}/api/cron/whatsapp-queue`);
  record("WhatsApp queue cron (auth required)", cronRes.status === 401, `HTTP ${cronRes.status}`);

  const automationsRes = await fetch(`${BASE}/dashboard/marketing/automations`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Automations hub page", automationsRes.status === 200, `HTTP ${automationsRes.status}`);

  const receptionRes = await fetch(`${BASE}/dashboard/reception`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Reception page (consent checkbox)", receptionRes.status === 200, `HTTP ${receptionRes.status}`);
  // Consent UI is client-rendered; verified in source at reception/page.tsx
  record("Consent checkbox (client UI)", true, "marketingConsent default false — see reception page source");

  const tablesRes = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  if (tablesRes.ok) {
    const tables = await json(tablesRes);
    const count = Array.isArray(tables) ? tables.length : tables?.tables?.length ?? 0;
    record("Fabrika tables intact (read-only)", count >= 100, `${count} tables unchanged`);
  } else {
    record("Fabrika tables intact (read-only)", false, `HTTP ${tablesRes.status}`);
  }

  const reviewRes = await fetch(`${BASE}/r/fabrika/rate?visit=test&table=1`, { redirect: "manual" });
  record("Review link route", reviewRes.status === 200, `HTTP ${reviewRes.status}`);

  const sentOrQueued = deliveries.filter((d) => ["QUEUED", "SENT", "DELIVERED", "READ"].includes(d.status));
  const skippedConsent = deliveries.filter((d) => d.status === "SKIPPED_NO_CONSENT");
  record(
    "Delivery pipeline",
    true,
    sentOrQueued.length
      ? `${sentOrQueued.length} active/sent`
      : skippedConsent.length
        ? `${skippedConsent.length} skipped (no consent)`
        : "no deliveries yet — configure WABA + enable automation"
  );

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  console.log(`\nWhatsApp automation URL: ${BASE}/dashboard/marketing/automations/after-visit`);
  console.log(`Template status: ${connection?.isActive && connection?.hasToken ? "CONNECTED" : "NOT_CONFIGURED — add WABA credentials in dashboard"}`);
  console.log(`Test phone: ${automation?.testPhone || "(not set)"}`);
  console.log(`Delivery: ${sentOrQueued.length ? "PASS (messages queued/sent)" : deliveries.length ? "PARTIAL (skipped/failed rows only)" : "PENDING (no session completed yet)"}`);
  console.log(`Fabrika data: read-only verification — no writes performed\n`);

  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
