/**
 * Refresh stuck Runway job via production API (poll only — no new generation).
 * Switches platform admin to Fabrika restaurant context first.
 * Usage: node scripts/refresh-stuck-runway-prod.mjs [runwayTaskIdOrJobId]
 */
const BASE = process.env.BASE_URL || "https://www.menuhus.com";
const TASK = process.argv[2] || "8eaa7926-f13a-41af-83e9-706a4519d10d";
const FABRIKA_SLUG = process.env.FABRIKA_SLUG || "menu-os-demo";
const RESTAURANT_ID = process.env.RESTAURANT_ID || "cmqidth3w0002uodgg9ugg3wa";
const EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
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
  console.error("Target restaurant not found for admin");
  process.exit(1);
}

const switchRes = await fetch(`${BASE}/api/restaurants/switch`, {
  method: "POST",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ restaurantId: target.id }),
});
const switchCookies = switchRes.headers.getSetCookie?.() || [];
cookie = mergeCookies(cookie, ...switchCookies.map((c) => c.split(";")[0]));
console.log("Switched to restaurant:", target.slug, target.id, switchRes.ok ? "ok" : "fail");

console.log("Polling Runway via GET /jobs/" + TASK + " (no new generation)…");
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 240000);
let refreshed;
try {
  const res = await fetch(`${BASE}/api/marketing/creative/video/jobs/${TASK}`, {
    headers: { Cookie: cookie },
    signal: ctrl.signal,
  });
  refreshed = await json(res);
  console.log("HTTP", res.status);
} catch (e) {
  console.error("Request failed:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  clearTimeout(timer);
}

console.log(
  "Job refresh:",
  JSON.stringify(
    {
      ok: Boolean(refreshed.jobId || refreshed.status),
      jobId: refreshed.jobId,
      status: refreshed.status,
      progress: refreshed.progress,
      runwayStatus: refreshed.runwayStatus,
      outputUrl: refreshed.outputUrl ? refreshed.outputUrl.slice(0, 80) + "…" : null,
      error: refreshed.error,
    },
    null,
    2
  )
);
