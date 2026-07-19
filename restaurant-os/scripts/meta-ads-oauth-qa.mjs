#!/usr/bin/env node
/**
 * Meta Ads OAuth URL QA — validates app_id format and redirect URI (no secrets logged).
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const EXPECTED_REDIRECT = "https://restaurant-os-nine.vercel.app/api/integrations/meta/callback";

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
      email: process.env.QA_ADMIN_EMAIL || "admin@menuos.sa",
      password: process.env.QA_ADMIN_PASSWORD || "admin123456",
      callbackUrl: `${BASE}/dashboard/platform/integrations`,
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
  console.log(`Meta Ads OAuth QA @ ${BASE}\n`);
  const cookie = await login();
  const preview = await json(
    await fetch(`${BASE}/api/marketing/connections/meta/oauth-preview`, { headers: { Cookie: cookie } })
  );

  const redirectOk = preview.redirectUri === EXPECTED_REDIRECT;
  const appIdOk = preview.appIdValid === true && preview.appId !== "(empty)" && preview.appId !== "(invalid-format)";
  const oauthOk = preview.oauthReady === true;

  console.log(`redirectUri: ${preview.redirectUri}`);
  console.log(`redirectUri match: ${redirectOk ? "PASS" : "FAIL"}`);
  console.log(`appId (masked): ${preview.appId}`);
  console.log(`appId valid: ${appIdOk ? "PASS" : "FAIL"}`);
  console.log(`hasSecret: ${preview.hasSecret ? "yes" : "no"}`);
  console.log(`oauthReady: ${oauthOk ? "PASS" : "FAIL"}`);
  console.log(`source: ${preview.source}`);

  const pass = redirectOk && appIdOk && oauthOk;
  console.log(`\nOAuth URL test: ${pass ? "PASS" : "FAIL"}`);

  if (!pass) {
    console.log("\nRequired: set META_APP_ID, META_APP_SECRET, META_ADS_REDIRECT_URI on Vercel");
    console.log("And fix Platform → Integrations → Meta App ID (numeric, not webhook URL)");
  }

  process.exit(pass ? 0 : 1);
}

main();
