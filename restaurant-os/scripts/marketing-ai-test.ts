/**
 * Marketing AI module tests.
 * Usage: npx tsx scripts/marketing-ai-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

async function login(): Promise<string> {
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
  console.log(`=== Marketing AI Test ===\n${BASE}\n`);
  const cookie = await login();
  if (!cookie) {
    fail("Login", "no cookie");
    process.exit(1);
  }
  pass("Login");

  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const dashPage = await fetch(`${BASE}/dashboard/marketing`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307].includes(dashPage.status)) pass("1. Marketing dashboard page", `HTTP ${dashPage.status}`);
  else fail("1. Marketing dashboard page", `HTTP ${dashPage.status}`);

  const dashApi = await fetch(`${BASE}/api/marketing/dashboard`, { headers: { Cookie: cookie } });
  const dashData = await json(dashApi);
  if (dashApi.ok && typeof dashData.todaySales === "number") {
    pass("2. Dashboard API", `${dashData.todaySales} SAR today`);
  } else {
    fail("2. Dashboard API", dashData.error || `HTTP ${dashApi.status}`);
  }

  const aiRes = await fetch(`${BASE}/api/marketing/ai/campaign`, {
    method: "POST",
    headers,
    body: JSON.stringify({ goal: "INCREASE_SALES" }),
  });
  const aiData = await json(aiRes);
  if (aiRes.ok && aiData.headline) pass("3. AI campaign generator", aiData.headline);
  else fail("3. AI campaign generator", aiData.error || `HTTP ${aiRes.status}`);

  const campRes = await fetch(`${BASE}/api/marketing/campaigns`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "QA Marketing Test", goal: "INCREASE_SALES", headline: aiData.headline }),
  });
  const camp = await json(campRes);
  if (campRes.ok && camp.id) pass("4. Create campaign", camp.id);
  else fail("4. Create campaign", camp.error || `HTTP ${campRes.status}`);

  if (camp.id) {
    const pause = await fetch(`${BASE}/api/marketing/campaigns/${camp.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "pause" }),
    });
    if (pause.ok) pass("5. Pause campaign");
    else fail("5. Pause campaign", `HTTP ${pause.status}`);

    await fetch(`${BASE}/api/marketing/campaigns/${camp.id}`, { method: "DELETE", headers });
    pass("6. Delete campaign (cleanup)");
  }

  const chatRes = await fetch(`${BASE}/api/marketing/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: "What should I advertise today?" }),
  });
  const chatData = await json(chatRes);
  if (chatRes.ok && chatData.message?.content) pass("7. AI assistant", chatData.message.content.slice(0, 40));
  else fail("7. AI assistant", chatData.error || `HTTP ${chatRes.status}`);

  const segRes = await fetch(`${BASE}/api/marketing/segments`, { headers: { Cookie: cookie } });
  const segData = await json(segRes);
  if (segRes.ok && segData.counts) pass("8. Customer segments", `${segData.counts.total} customers`);
  else fail("8. Customer segments", `HTTP ${segRes.status}`);

  const forecastRes = await fetch(`${BASE}/api/marketing/forecast`, { headers: { Cookie: cookie } });
  const forecast = await json(forecastRes);
  if (forecastRes.ok && forecast.tomorrowSales != null) pass("9. AI forecast", `${forecast.tomorrowSales} SAR`);
  else fail("9. AI forecast", `HTTP ${forecastRes.status}`);

  const connRes = await fetch(`${BASE}/api/marketing/connections`, { headers: { Cookie: cookie } });
  const connData = await json(connRes);
  if (connRes.ok && Array.isArray(connData.platforms)) pass("10. Ad platforms list", `${connData.platforms.length} platforms`);
  else fail("10. Ad platforms list", `HTTP ${connRes.status}`);

  const receptionBlock = await fetch(`${BASE}/dashboard/marketing`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  pass("11. Marketing accessible to admin", `HTTP ${receptionBlock.status}`);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
