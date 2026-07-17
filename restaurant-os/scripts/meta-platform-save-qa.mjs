/**
 * Meta / WhatsApp platform config save QA
 * Usage: node scripts/meta-platform-save-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const TEST_TOKEN = `qa-verify-${Date.now()}`;

const results = [];
function pass(n, d = "") {
  results.push({ ok: true, n, d });
  console.log(`PASS  ${n}${d ? ` — ${d}` : ""}`);
}
function fail(n, d = "") {
  results.push({ ok: false, n, d });
  console.log(`FAIL  ${n}${d ? ` — ${d}` : ""}`);
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

async function timedFetch(url, init, maxMs = 15000) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), maxMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return { res, elapsed: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\nMeta Platform Save QA @ ${BASE}\n`);

  let cookie = "";
  try {
    cookie = await login();
    pass("Platform admin login");
  } catch (e) {
    fail("Platform admin login", String(e.message));
    process.exit(1);
  }

  const getRes = await fetch(`${BASE}/api/platform/meta?health=0`, {
    headers: { Cookie: cookie },
  });
  const getData = await json(getRes);
  if (!getRes.ok) {
    fail("GET meta config", `HTTP ${getRes.status}`);
    process.exit(1);
  }
  pass("GET meta config (fast, no health)");

  if (typeof getData.encryptionReady === "boolean") {
    pass("encryptionReady flag present", getData.encryptionReady ? "configured" : "NOT configured");
  } else {
    fail("encryptionReady flag present");
  }

  if (!getData.encryptionReady) {
    console.log("\n--- Cannot test encrypted save without MARKETING_TOKEN_SECRET ---\n");
    const { res, elapsed } = await timedFetch(
      `${BASE}/api/platform/meta`,
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ webhookVerifyToken: TEST_TOKEN }),
      },
      15000
    );
    const data = await json(res);
    if (!res.ok && data.error && elapsed < 15000) {
      pass("Save returns Arabic error quickly when encryption missing", `${elapsed}ms`);
    } else if (elapsed >= 15000) {
      fail("Save completes within 15s", `${elapsed}ms (hung)`);
    } else {
      fail("Save returns clear error when encryption missing", JSON.stringify(data).slice(0, 120));
    }
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  }

  const { res: patchRes, elapsed } = await timedFetch(
    `${BASE}/api/platform/meta`,
    {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ webhookVerifyToken: TEST_TOKEN }),
    },
    15000
  );
  const patchData = await json(patchRes);

  if (elapsed >= 15000) {
    fail("PATCH save completes within 15s", `${elapsed}ms`);
  } else {
    pass("PATCH save completes within 15s", `${elapsed}ms`);
  }

  if (patchRes.ok && patchData.hasWebhookVerifyToken) {
    pass("Webhook Verify Token saved (encrypted flag set)");
  } else {
    fail("Webhook Verify Token save", patchData.error || `HTTP ${patchRes.status}`);
  }

  const webhookGet = await fetch(
    `${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(TEST_TOKEN)}&hub.challenge=qa-challenge-123`
  );
  const challenge = await webhookGet.text();
  if (webhookGet.ok && challenge === "qa-challenge-123") {
    pass("WhatsApp GET webhook verifies saved token");
  } else {
    fail("WhatsApp GET webhook verification", `HTTP ${webhookGet.status}`);
  }

  const webhookPost = await fetch(`${BASE}/api/webhooks/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry: [] }),
  });
  if (webhookPost.ok) {
    pass("WhatsApp POST webhook handler intact");
  } else {
    fail("WhatsApp POST webhook handler", `HTTP ${webhookPost.status}`);
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n--- Meta Platform Save QA: ${ok}/${results.length} PASS ---\n`);
  process.exit(ok === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
