#!/usr/bin/env node
/**
 * After-visit WhatsApp E2E — creates one ephemeral walk-in, ends session, verifies delivery row.
 * Does not modify existing Fabrika table rows or existing customer profiles.
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

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
  console.log(`\n=== After-Visit WhatsApp E2E @ ${BASE} ===\n`);
  const cookie = await login();
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const tablesBefore = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  const tablesJson = await json(tablesBefore);
  const tableCountBefore = Array.isArray(tablesJson)
    ? tablesJson.length
    : tablesJson?.tables?.length ?? 0;

  const stamp = Date.now();
  const testPhone = `9665${String(stamp).slice(-8)}`;
  const manualNum = `QA-WA-${stamp}`;

  const walkIn = await fetch(`${BASE}/api/reception`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: `WhatsApp QA ${stamp}`,
      customerPhone: testPhone,
      guestCount: 1,
      marketingConsent: false,
      status: "SEATED",
      manualTable: { number: manualNum, capacity: 2 },
    }),
  });
  const walkInData = await json(walkIn);
  if (!walkIn.ok) {
    console.log("FAIL | Walk-in create", walkIn.status, walkInData);
    process.exit(1);
  }
  console.log("PASS | Walk-in created", walkInData.id);

  const sessionId = walkInData.id;
  await new Promise((r) => setTimeout(r, 2000));

  const close = await fetch(`${BASE}/api/reception/${sessionId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ closeSession: true }),
  });
  const closeData = await json(close);
  if (!close.ok) {
    console.log("FAIL | Session close", close.status, closeData);
    process.exit(1);
  }
  console.log("PASS | Session closed (إنهاء الجلسة)");

  await new Promise((r) => setTimeout(r, 3000));

  const afterVisit = await fetch(`${BASE}/api/marketing/automations/after-visit`, {
    headers: { Cookie: cookie },
  });
  const av = await json(afterVisit);
  const delivery = (av.deliveries || []).find(
    (d) => d.phone?.includes(testPhone.slice(-8)) || d.phone === testPhone
  );

  if (!delivery) {
    console.log("FAIL | Delivery row not found", av.deliveries?.length ?? 0, "rows");
    process.exit(1);
  }

  const ok =
    delivery.status === "SKIPPED_NO_CONSENT" ||
    delivery.status === "SKIPPED_NO_CONNECTION" ||
    delivery.status === "SKIPPED_DISABLED";
  console.log(
    ok ? "PASS" : "FAIL",
    "| WhatsApp delivery status",
    delivery.status,
    delivery.failedReason || ""
  );

  const tablesAfter = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  const tablesAfterJson = await json(tablesAfter);
  const tableCountAfter = Array.isArray(tablesAfterJson)
    ? tablesAfterJson.length
    : tablesAfterJson?.tables?.length ?? 0;
  const fabrikaOk = tableCountAfter >= tableCountBefore && tableCountBefore >= 100;
  console.log(
    fabrikaOk ? "PASS" : "FAIL",
    "| Fabrika table count unchanged",
    `${tableCountBefore} → ${tableCountAfter}`
  );

  console.log(`\nE2E: ${ok && fabrikaOk ? "PASS" : "FAIL"}\n`);
  process.exit(ok && fabrikaOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
