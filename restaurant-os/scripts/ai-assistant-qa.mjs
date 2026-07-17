/**
 * AI Assistant production QA — read-only + QA-only writes on Fabrika.
 * Usage: node scripts/ai-assistant-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const FABRIKA_SLUG = "fabrika-mqkat9dw";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results = {};

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) parts.add(c.split(";")[0]);
  return [...parts].join("; ");
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  let cookie = parseSetCookie(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return parseSetCookie(loginRes, cookie);
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
  return parseSetCookie(sw, cookie);
}

async function chat(cookie, message) {
  const res = await fetch(`${BASE}/api/ai-assistant/chat`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return { status: res.status, data: await json(res) };
}

async function main() {
  console.log(`\nAI Assistant QA @ ${BASE}\n`);

  let cookie = await login();
  cookie = await switchFabrika(cookie);

  const pageRes = await fetch(`${BASE}/dashboard/ai-assistant`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  results.page = [200, 307, 302].includes(pageRes.status) ? "PASS" : "FAIL";
  console.log(`Page load: ${results.page}`);

  const histRes = await fetch(`${BASE}/api/ai-assistant/history`, { headers: { Cookie: cookie } });
  results.historyApi = histRes.ok ? "PASS" : "FAIL";
  console.log(`History API: ${results.historyApi}`);

  const t1 = await chat(cookie, "اعرض حجوزات اليوم");
  results.todayReservations =
    t1.status === 200 && (t1.data.reply || t1.data.toolResults?.length)
      ? "PASS"
      : "FAIL";
  console.log(`Today reservations: ${results.todayReservations}`);

  const t2 = await chat(cookie, "هل واتساب فابريكا متصل؟");
  results.whatsappStatus =
    t2.status === 200 && String(t2.data.reply || "").length > 0 ? "PASS" : "FAIL";
  console.log(`WhatsApp status: ${results.whatsappStatus}`);

  const t3 = await chat(cookie, "كم عدد زوار أمس؟");
  results.yesterdayVisitors =
    t3.status === 200 && (t3.data.toolResults?.length || t3.data.reply) ? "PASS" : "FAIL";
  console.log(`Yesterday visitors: ${results.yesterdayVisitors}`);

  const t4 = await chat(cookie, "اعرض الأمنيات الجديدة");
  results.wishes = t4.status === 200 ? "PASS" : "FAIL";
  console.log(`List wishes: ${results.wishes}`);

  const t5 = await chat(cookie, "اعرض الإهداءات المعلقة");
  results.gifts = t5.status === 200 ? "PASS" : "FAIL";
  console.log(`List gifts: ${results.gifts}`);

  const t6 = await chat(cookie, "اعرض طلبات الأغاني");
  results.songs = t6.status === 200 ? "PASS" : "FAIL";
  console.log(`List songs: ${results.songs}`);

  const t7 = await chat(cookie, "عيّن الحجز QA-TEST-ONLY على طاولة 100");
  results.assignTableConfirmation =
    t7.status === 200 && t7.data.pendingAction?.pendingActionId ? "PASS" : "FAIL";
  console.log(`Assign table requires confirmation: ${results.assignTableConfirmation}`);

  if (t7.data.pendingAction?.pendingActionId) {
    const cancelRes = await fetch(`${BASE}/api/ai-assistant/confirm`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        pendingActionId: t7.data.pendingAction.pendingActionId,
        idempotencyKey: t7.data.pendingAction.pendingActionId,
        confirm: false,
      }),
    });
    results.assignTableCancelled = cancelRes.ok ? "PASS" : "FAIL";
    console.log(`Assign cancelled (no data change): ${results.assignTableCancelled}`);
  } else {
    results.assignTableCancelled = "PASS";
  }

  const html = await (await fetch(`${BASE}/dashboard/ai-assistant`, { headers: { Cookie: cookie } })).text();
  results.noApiKeyInUi =
    !html.includes("sk-") && !html.includes("OPENAI_API_KEY") ? "PASS" : "FAIL";
  console.log(`No API keys in UI: ${results.noApiKeyInUi}`);

  console.log("\n=== Summary ===");
  console.log(`Assistant URL: ${BASE}/dashboard/ai-assistant`);
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v}`);
  }
  const failed = Object.values(results).filter((v) => v === "FAIL");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
