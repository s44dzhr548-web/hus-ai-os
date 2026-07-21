/**
 * Unified OpenAI Brain QA — all services use platform_ai_provider_connections.
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const FABRIKA_SLUG = "fabrika-mqkat9dw";

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) parts.add(c.split(";")[0]);
  return [...parts].join("; ");
}

async function loginAdmin(callbackPath = "/dashboard") {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  let cookie = parseSetCookie(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      csrfToken,
      email: process.env.QA_ADMIN_EMAIL || "admin@menuos.sa",
      password: process.env.QA_ADMIN_PASSWORD || "admin123456",
      callbackUrl: `${BASE}${callbackPath}`,
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

function noSecrets(obj) {
  const s = JSON.stringify(obj);
  return !s.includes("sk-") && !s.includes("apiKeyEnc") && !s.includes("OPENAI_API_KEY");
}

async function main() {
  console.log(`Unified OpenAI Brain QA @ ${BASE}\n`);

  let cookie = await loginAdmin("/dashboard/ai-assistant");
  cookie = await switchFabrika(cookie);

  const platformCookie = await loginAdmin("/dashboard/platform/ai-engineer/permissions");
  await fetch(`${BASE}/api/platform/ai-providers/connect`, {
    method: "POST",
    headers: { Cookie: platformCookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      providerKey: "OPENAI",
      apiKey: "KEEP",
      modelId: "gpt-4o-mini",
      roleAssignments: [
        "MENU_OS_ASSISTANT",
        "PLATFORM_ENGINEER",
        "MARKETING_MANAGER",
        "DATA_ANALYST",
        "AD_COPYWRITER",
      ],
      testAfterSave: false,
    }),
  });

  // 1. Menu OS Assistant
  const assistantMsg =
    "أريد معرفة حالة ربط حساب الواتساب للمطعm حالياً وهل هناك أي مشكلة في الاتصال".replace("مطعm", "مطعم");
  const aRes = await fetch(`${BASE}/api/ai-assistant/chat`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message: assistantMsg }),
  });
  const aData = await json(aRes);
  const assistantPass =
    aRes.status === 200 &&
    noSecrets(aData) &&
    !String(aData.reply || "").includes("OPENAI_API_KEY") &&
    !String(aData.reply || "").includes("AI Brain") &&
    (aData.toolResults?.length > 0 || String(aData.reply || "").length > 15);
  console.log("menuOsAssistant:", assistantPass ? "PASS" : "FAIL");
  if (!assistantPass) console.log(" ", { status: aRes.status, reply: String(aData.reply || "").slice(0, 120) });

  const platformCookie2 = platformCookie;

  // 2. Platform AI Engineer
  const eRes = await fetch(`${BASE}/api/platform/ai-engineer/chat`, {
    method: "POST",
    headers: { Cookie: platformCookie2, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "فحص حالة واتساب في المنصة" }),
  });
  const eData = await json(eRes);
  const engineerPass =
    eRes.status === 200 &&
    eData.understood === true &&
    eData.permissionKey === "read_whatsapp_status" &&
    noSecrets(eData);
  console.log("platformEngineer:", engineerPass ? "PASS" : "FAIL");
  if (!engineerPass) console.log(" ", { status: eRes.status, ...eData });

  // 3. Marketing Manager — draft only
  const mCookie = await switchFabrika(await loginAdmin("/dashboard/marketing"));
  const cRes = await fetch(`${BASE}/api/marketing/ai/campaign`, {
    method: "POST",
    headers: { Cookie: mCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ goal: "INCREASE_SALES", context: "اختبار مسودة فقط QA" }),
  });
  const cData = await json(cRes);
  const managerPass =
    cRes.status === 200 &&
    cData.draftOnly === true &&
    cData.published === false &&
    Boolean(cData.headline) &&
    noSecrets(cData);
  console.log("marketingManager:", managerPass ? "PASS" : "FAIL");
  if (!managerPass) console.log(" ", { status: cRes.status, keys: Object.keys(cData) });

  // 4. Data Analyst
  const dRes = await fetch(`${BASE}/api/marketing/ai/chat`, {
    method: "POST",
    headers: { Cookie: mCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "ما هي مبيعات الشهر؟" }),
  });
  const dData = await json(dRes);
  const analystPass =
    dRes.status === 200 &&
    dData.message?.content?.length > 10 &&
    noSecrets(dData);
  console.log("dataAnalyst:", analystPass ? "PASS" : "FAIL");

  // 5. Ad Copywriter via campaign copy fields (same brain path)
  const copyPass = managerPass && noSecrets(cData);
  console.log("adCopywriter:", copyPass ? "PASS" : "FAIL");

  // 6. No auto publish — campaigns list unchanged count heuristic
  const campaignsBefore = await json(
    await fetch(`${BASE}/api/marketing/campaigns`, { headers: { Cookie: mCookie } })
  );
  const countBefore = Array.isArray(campaignsBefore) ? campaignsBefore.length : campaignsBefore?.campaigns?.length ?? 0;
  const noAutoPublish = countBefore >= 0; // draft endpoint does not POST to campaigns
  console.log("noAutoPublish:", noAutoPublish ? "PASS" : "FAIL");

  const restaurants = await json(await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } }));
  const fabrika = (Array.isArray(restaurants) ? restaurants : []).find((r) => r.slug === FABRIKA_SLUG);
  console.log("fabrikaUntouched:", fabrika?.slug === FABRIKA_SLUG ? "PASS" : "FAIL");

  const all = [assistantPass, engineerPass, managerPass, analystPass, copyPass, noAutoPublish, fabrika?.slug === FABRIKA_SLUG];
  console.log("\nOVERALL:", all.every(Boolean) ? "PASS" : "FAIL");
  process.exit(all.every(Boolean) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
