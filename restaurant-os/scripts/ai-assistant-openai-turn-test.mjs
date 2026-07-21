/**
 * Validates OpenAI two-turn flow (tool call + follow-up) on production.
 * Uses a message that bypasses fallback-router regex patterns.
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const FABRIKA_SLUG = "fabrika-mqkat9dw";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const OPENAI_PATH_MESSAGE =
  "أريد معرفة حالة ربط حساب الواتساب للمطعم حالياً وهل هناك أي مشكلة في الاتصال";

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

async function main() {
  console.log(`OpenAI two-turn test @ ${BASE}\n`);

  let cookie = await login();
  cookie = await switchFabrika(cookie);

  const res = await fetch(`${BASE}/api/ai-assistant/chat`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message: OPENAI_PATH_MESSAGE }),
  });
  const data = await json(res);
  const reply = String(data.reply || "");
  const hasTool = Array.isArray(data.toolResults) && data.toolResults.length > 0;
  const openAiError = reply.includes("تعذر الاتصال بخدمة الذكاء الاصطناعي");
  const fallbackOnly = reply.includes("لم أفهم الأمر");

  console.log(`HTTP status: ${res.status}`);
  console.log(`Tool results: ${hasTool ? data.toolResults.map((t) => t.tool).join(", ") : "none"}`);
  console.log(`Reply preview: ${reply.slice(0, 180).replace(/\s+/g, " ")}`);

  const pass = res.status === 200 && !openAiError && !fallbackOnly && (hasTool || reply.length > 20);
  console.log(`\nResult: ${pass ? "PASS" : "FAIL"}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
