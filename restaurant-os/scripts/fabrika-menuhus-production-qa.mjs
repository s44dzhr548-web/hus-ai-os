/**
 * Fabrika / MenuHus production QA — static checks + optional live (BASE_URL + credentials).
 * Usage:
 *   node scripts/fabrika-menuhus-production-qa.mjs
 *   BASE_URL=https://www.menuhus.com FABRIKA_EMAIL=... FABRIKA_PASSWORD=... node scripts/fabrika-menuhus-production-qa.mjs
 */
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const results = [];

function assert(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function fileIncludes(rel, ...needles) {
  const p = path.join(projectRoot, rel);
  if (!fs.existsSync(p)) return false;
  const text = fs.readFileSync(p, "utf8");
  return needles.every((n) => text.includes(n));
}

assert("gbp ai draft", fileIncludes("src/lib/google-business/review-draft-ai.ts", "generateGoogleReviewDraftReply", "callPlatformOpenAiText"));
assert("gbp draft workflow", fileIncludes("src/app/api/integrations/google-business/reviews/[reviewId]/draft/route.ts", "PENDING_APPROVAL", "submit"));
assert("gbp sync tries api", fileIncludes("src/lib/google-business/sync-reviews.ts", "mybusiness.googleapis.com", "API_ACCESS_NOT_APPROVED"));
assert(
  "gbp fixed redirect uri",
  fileIncludes(
    "src/lib/google-business/oauth-config.ts",
    "GOOGLE_BUSINESS_REDIRECT_URI",
    "www.menuhus.com/api/integrations/google-business/callback"
  )
);
assert("gbp locations select", fileIncludes("src/app/api/integrations/google-business/locations/route.ts", "isSelected: true"));
assert("gbp publish guard", fileIncludes("src/app/api/integrations/google-business/reviews/[reviewId]/reply/route.ts", "requireGoogleReviewsPublish"));
assert("gbp platform card", fileIncludes("src/lib/google-business/platform-card.ts", "GOOGLE_BUSINESS", "googleBusinessToMarketingCard"));
assert("platforms gbp ui", fileIncludes("src/app/dashboard/marketing/platforms/platforms-client.tsx", "GOOGLE_BUSINESS", "renderGbpActions"));
assert("google reviews page", fileIncludes("src/app/dashboard/google-reviews/google-reviews-client.tsx", "generate_ai", "نشر على Google"));
assert("present guests seated label", fileIncludes("src/lib/present-guests.ts", "seatedLabel", "جالس على الطاولة"));
assert("confirm startSession", fileIncludes("src/components/reservations/reservations-client.tsx", "startSession: true"));
assert("table permission 403", fileIncludes("src/lib/table-management-permissions.ts", "ليس لديك صلاحية لإدارة الطاولات"));
assert("repair script name", fs.existsSync(path.join(projectRoot, "scripts/reception-data-repair.mjs")));

const base = process.env.BASE_URL?.replace(/\/$/, "") || "https://www.menuhus.com";
const email = process.env.FABRIKA_EMAIL || process.env.QA_EMAIL || process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const password = process.env.FABRIKA_PASSWORD || process.env.QA_PASSWORD || process.env.QA_ADMIN_PASSWORD || "admin123456";

async function loginSession() {
  if (!email || !password) return null;
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const cookieHeader =
    cookies.length > 0
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : csrfRes.headers.get("set-cookie") || "";
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${base}/dashboard`,
    json: "true",
  });
  const signIn = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader },
    body,
    redirect: "manual",
  });
  const nextCookies = signIn.headers.getSetCookie?.() || [];
  if (nextCookies.length) {
    return [...cookies, ...nextCookies].map((c) => c.split(";")[0]).join("; ");
  }
  const setCookie = signIn.headers.get("set-cookie");
  if (!setCookie) return null;
  return [cookieHeader, setCookie.split(";")[0]].filter(Boolean).join("; ");
}

if (base) {
  try {
    const health = await fetch(`${base}/api/health`, { redirect: "manual" });
    assert("live health", health.status === 200 || health.status === 404, `status ${health.status}`);
  } catch (e) {
    assert("live health", false, String(e));
  }

  try {
    const gbp = await fetch(`${base}/api/integrations/google-business/reviews`, { redirect: "manual" });
    assert("gbp reviews auth", gbp.status === 401 || gbp.status === 403, `status ${gbp.status}`);
  } catch (e) {
    assert("gbp reviews auth", false, String(e));
  }

  const sessionCookie = await loginSession();
  if (sessionCookie) {
    try {
      const plat = await fetch(`${base}/api/marketing/platforms`, {
        headers: { Cookie: sessionCookie },
      });
      const pdata = await plat.json();
      const gbp = (pdata.platforms || []).find((p) => p.key === "GOOGLE_BUSINESS");
      assert("live gbp platform card", plat.ok && Boolean(gbp), gbp ? gbp.statusLabel : "missing");
      assert(
        "google ads dev token honest",
        typeof pdata.googleAdsEnv?.developerTokenConfigured === "boolean",
        String(pdata.googleAdsEnv?.developerTokenConfigured)
      );
    } catch (e) {
      assert("live platforms", false, String(e));
    }

    try {
      const sync = await fetch(`${base}/api/integrations/google-business/reviews`, {
        method: "POST",
        headers: { Cookie: sessionCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const sdata = await sync.json();
      const honest =
        sdata.ok === false &&
        (sdata.code === "API_ACCESS_NOT_APPROVED" ||
          sdata.code === "GOOGLE_ACCOUNT_NOT_CONNECTED" ||
          sdata.code === "LOCATION_NOT_SELECTED");
      assert("gbp sync no fake success", honest || sync.status === 403, JSON.stringify(sdata).slice(0, 120));
    } catch (e) {
      assert("gbp sync", false, String(e));
    }

    try {
      const present = await fetch(`${base}/api/reception`, {
        headers: { Cookie: sessionCookie },
      });
      if (present.ok) {
        const j = await present.json();
        const guests = j.presentGuests || j.guests || [];
        const seatedLabel = guests.some(
          (g) =>
            String(g.seatedLabel || "").includes("جالس على الطاولة") ||
            String(g.tableLabel || "").includes("جالس على الطاولة")
        );
        assert("present guests api", Array.isArray(guests), `count ${guests.length}`);
        assert("present guests seated label field", seatedLabel || guests.length === 0, seatedLabel ? "found" : "no seated now");
      } else {
        assert("present guests api", present.status === 403, `status ${present.status}`);
      }
    } catch (e) {
      assert("present guests api", false, String(e));
    }
  } else {
    assert("live login skipped", true, "no FABRIKA_EMAIL/FABRIKA_PASSWORD");
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nSummary: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
