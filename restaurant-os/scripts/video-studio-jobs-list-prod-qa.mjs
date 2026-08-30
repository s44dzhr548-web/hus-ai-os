/**
 * QA: jobs list loads from DB on production (no new generation).
 * Usage: node scripts/video-studio-jobs-list-prod-qa.mjs
 */
const BASE = process.env.BASE_URL || "https://www.menuhus.com";
const RESTAURANT_ID = process.env.RESTAURANT_ID || "cmqidth3w0002uodgg9ugg3wa";
const FABRIKA_SLUG = process.env.FABRIKA_SLUG || "menu-os-demo";
const EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const LEGACY_JOB = process.env.LEGACY_JOB_ID || "cms6kiejs0001jt04n8cdcw84";

async function json(res) {
  return res.json().catch(() => ({}));
}

function mergeCookies(...parts) {
  const jar = new Map();
  for (const part of parts.filter(Boolean).join("; ").split(";")) {
    const t = part.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    if (eq > 0) jar.set(t.slice(0, eq), t.slice(eq + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader },
    body: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  const next = loginRes.headers.getSetCookie?.() || [];
  return mergeCookies(cookieHeader, ...next.map((c) => c.split(";")[0]));
}

let cookie = await login();
console.log("Login:", cookie ? "ok" : "fail");
if (!cookie) process.exit(1);

const restaurants = await json(await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } }));
const target =
  (Array.isArray(restaurants) ? restaurants : []).find((r) => r.id === RESTAURANT_ID) ||
  (Array.isArray(restaurants) ? restaurants : []).find((r) => r.slug === FABRIKA_SLUG);
if (!target?.id) {
  console.error("Restaurant not found");
  process.exit(1);
}

const switchRes = await fetch(`${BASE}/api/restaurants/switch`, {
  method: "POST",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ restaurantId: target.id }),
});
cookie = mergeCookies(cookie, ...(switchRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]));
console.log("Restaurant:", target.slug);

const t0 = Date.now();
const listRes = await fetch(`${BASE}/api/marketing/creative/video/jobs`, {
  headers: { Cookie: cookie },
  signal: AbortSignal.timeout(30000),
});
const list = await json(listRes);
console.log("GET /jobs (DB only):", listRes.status, `${Date.now() - t0}ms`, "count=", (list.jobs ?? []).length);

const legacy = (list.jobs ?? []).find((j) => j.jobId === LEGACY_JOB);
if (legacy) {
  console.log(
    "Legacy job in list:",
    JSON.stringify({
      jobId: legacy.jobId,
      status: legacy.status,
      progress: legacy.progress,
      hasOutput: Boolean(legacy.outputUrl),
    })
  );
} else {
  console.warn("Legacy job NOT in list — check restaurant context");
}

const t1 = Date.now();
const syncRes = await fetch(`${BASE}/api/marketing/creative/video/jobs?sync=1`, {
  headers: { Cookie: cookie },
  signal: AbortSignal.timeout(120000),
});
const synced = await json(syncRes);
console.log("GET /jobs?sync=1:", syncRes.status, `${Date.now() - t1}ms`, "count=", (synced.jobs ?? []).length);

const legacy2 = (synced.jobs ?? []).find((j) => j.jobId === LEGACY_JOB);
if (legacy2?.status === "SUCCEEDED" && legacy2.outputUrl) {
  console.log("PASS: completed job has outputUrl");
} else if (legacy2) {
  console.log("Legacy after sync:", legacy2.status, legacy2.progress);
} else {
  console.log("FAIL: legacy job missing after sync");
  process.exit(1);
}
