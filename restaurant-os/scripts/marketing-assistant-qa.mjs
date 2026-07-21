#!/usr/bin/env node
/**
 * Marketing AI Assistant QA — OpenAI campaign generation + draft save (read/write draft only).
 * Usage: node scripts/marketing-assistant-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const FABRIKA_SLUG = "fabrika-mqkat9dw";

const TEST_PROMPT =
  "أنشئ حملة إعلانية لفابريكا تبدأ اليوم، الميزانية 500 ريال، الهدف زيادة الحجوزات، سناب وتيك توك، ولا تنشر قبل موافقتي.";

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
      callbackUrl: `${BASE}/dashboard/marketing/assistant`,
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
  return { cookie: next, fabrikaId: fab.id };
}

async function main() {
  console.log(`Marketing AI Assistant QA: ${BASE}\n`);
  let cookie = "";
  try {
    cookie = await login();
    record("Login", !!cookie);
    const switched = await switchFabrika(cookie);
    cookie = switched.cookie;
    record("Switch to Fabrika", !!switched.fabrikaId, switched.fabrikaId);
  } catch (e) {
    record("Login", false, e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const chatRes = await fetch(`${BASE}/api/marketing/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ message: TEST_PROMPT }),
  });
  const chatData = await json(chatRes);

  const openAiOk =
    chatRes.ok &&
    chatData.source === "openai" &&
    chatData.type === "campaign_proposal" &&
    chatData.proposal?.name &&
    Array.isArray(chatData.proposal?.platforms) &&
    chatData.proposal.platforms.length > 0;
  record(
    "OpenAI campaign proposal",
    openAiOk,
    openAiOk
      ? `${chatData.proposal.name} · ${chatData.proposal.platforms.length} platforms · model ${chatData.modelId || "?"}`
      : `status ${chatRes.status} ${chatData.error || chatData.type || ""}`
  );

  if (!openAiOk) {
    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
    process.exit(1);
  }

  const saveRes = await fetch(`${BASE}/api/marketing/assistant/campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ proposal: chatData.proposal }),
  });
  const saveData = await json(saveRes);
  const saveOk = saveRes.ok && saveData.campaign?.id;
  record(
    "Save draft",
    saveOk,
    saveOk ? `campaignId ${saveData.campaign.id}` : saveData.error || `status ${saveRes.status}`
  );

  const pageRes = await fetch(`${BASE}/dashboard/marketing/assistant`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Assistant page", pageRes.status === 200, `status ${pageRes.status}`);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
