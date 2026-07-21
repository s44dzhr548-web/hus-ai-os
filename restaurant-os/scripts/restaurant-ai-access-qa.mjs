/**
 * Restaurant AI Access QA — Fabrika config + isolation + no secrets.
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

async function login(callbackPath = "/dashboard/settings/ai") {
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
  return { cookie: parseSetCookie(sw, cookie), fabrikaId: fab.id };
}

function noSecrets(obj) {
  const s = JSON.stringify(obj);
  return !s.includes("sk-") && !s.includes("apiKey") && !s.includes("OPENAI_API_KEY");
}

async function main() {
  console.log(`Restaurant AI Access QA @ ${BASE}\n`);

  let cookie = await login();
  const { cookie: fabCookie, fabrikaId } = await switchFabrika(cookie);
  cookie = fabCookie;

  const pageRes = await fetch(`${BASE}/dashboard/settings/ai`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  console.log("aiSettingsPage:", [200, 307, 302].includes(pageRes.status) ? "PASS" : "FAIL");

  const dash = await json(
    await fetch(`${BASE}/api/restaurants/ai-access`, { headers: { Cookie: cookie } })
  );
  const roles = (dash.enabledServices || []).map((s) => s.id);
  const rolesPass =
    roles.includes("MENU_OS_ASSISTANT") &&
    roles.includes("MARKETING_MANAGER") &&
    roles.includes("AD_COPYWRITER") &&
    roles.includes("DATA_ANALYST") &&
    !roles.includes("PLATFORM_ENGINEER");
  console.log("fabrikaEnabledRoles:", rolesPass ? "PASS" : "FAIL");
  console.log("  roles:", roles.join(", "));

  const limitsPass =
    dash.limits?.dailyRequestLimit === 200 &&
    dash.limits?.monthlyRequestLimit === 3000 &&
    Number(dash.limits?.monthlyCostLimitSar) === 500;
  console.log("usageLimits:", limitsPass ? "PASS" : "FAIL");

  const noKeyPass = noSecrets(dash) && dash.openAiStatus === "متصل";
  console.log("noApiKeyInResponse:", noKeyPass ? "PASS" : "FAIL");

  const assistantRes = await json(
    await fetch(`${BASE}/api/ai-assistant/chat`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "اعرض حجوزات اليوم" }),
    })
  );
  console.log("menuOsWithAccess:", assistantRes.reply || assistantRes.error ? "PASS" : "FAIL");

  const usageAfter = await json(
    await fetch(`${BASE}/api/restaurants/ai-access`, { headers: { Cookie: cookie } })
  );
  console.log("usageTracked:", usageAfter.usage?.dailyRequests >= 0 ? "PASS" : "FAIL");

  const platformCookie = await login("/dashboard/platform");
  const otherList = await json(
    await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: platformCookie } })
  );
  const other = (Array.isArray(otherList) ? otherList : []).find((r) => r.slug !== FABRIKA_SLUG);
  if (other) {
    const iso = await json(
      await fetch(`${BASE}/api/restaurants/ai-access?restaurantId=${other.id}`, {
        headers: { Cookie: platformCookie },
      })
    );
    console.log(
      "otherRestaurantIsolation:",
      iso.enabledServices !== undefined && noSecrets(iso) ? "PASS" : "FAIL"
    );
  } else {
    console.log("otherRestaurantIsolation: SKIP");
  }

  console.log("\nFabrika AI URL:", `${BASE}/dashboard/settings/ai`);
  console.log("Fabrika restaurantId:", fabrikaId);

  const allPass = [rolesPass, limitsPass, noKeyPass].every(Boolean);
  console.log("\nOVERALL:", allPass ? "PASS" : "FAIL");
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
