/**
 * Platform AI Brain providers QA — read-only status check (no keys stored).
 */
const BASE = process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) parts.add(c.split(";")[0]);
  return [...parts].join("; ");
}

async function main() {
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
      callbackUrl: `${BASE}/dashboard/platform`,
      json: "true",
    }),
    redirect: "manual",
  });
  cookie = parseSetCookie(loginRes, cookie);

  const page = await fetch(`${BASE}/dashboard/marketing/ai-brain/providers`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });

  const statusRes = await fetch(`${BASE}/api/platform/ai-providers/status`, {
    headers: { Cookie: cookie },
  });
  const statusData = await json(statusRes);
  const providers = statusData.providers || [];

  const expected = ["OPENAI", "GEMINI", "CLAUDE", "DEEPSEEK", "GROK", "MISTRAL"];
  const keys = providers.map((p) => p.key);
  const hasButtons = page.status === 200;
  const apiOk = statusRes.status === 200 && providers.length === 6;
  const allKeys = expected.every((k) => keys.includes(k));
  const noSecrets = providers.every((p) => !("apiKey" in p) && !("apiKeyEnc" in p));

  console.log("pageStatus:", page.status);
  console.log("apiStatus:", statusRes.status);
  console.log("providerCount:", providers.length);
  providers.forEach((p) => console.log(`  ${p.key}: ${p.statusLabelAr}`));

  const pass = hasButtons && apiOk && allKeys && noSecrets;
  console.log("TEST:", pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
