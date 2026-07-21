#!/usr/bin/env node
/**
 * Meta OAuth redirect URI consistency + connect endpoint QA.
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
      callbackUrl: `${BASE}/dashboard/marketing/platforms`,
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
  const fab = (Array.isArray(list) ? list : []).find((r) => r.slug === "fabrika-mqkat9dw");
  if (!fab) throw new Error("Fabrika not found");
  const sw = await fetch(`${BASE}/api/restaurants/switch`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId: fab.id }),
  });
  return [
    ...cookie.split("; ").filter(Boolean),
    ...(sw.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

function extractRedirectUri(oauthUrl) {
  try {
    return new URL(oauthUrl).searchParams.get("redirect_uri");
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Meta OAuth callback QA @ ${BASE}\n`);
  let cookie = await login();
  cookie = await switchFabrika(cookie);

  const preview = await json(
    await fetch(`${BASE}/api/marketing/connections/meta/oauth-preview`, { headers: { Cookie: cookie } })
  );

  const connectRes = await fetch(`${BASE}/api/integrations/meta/connect`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const oauthUrl = connectRes.headers.get("location") || "";
  const connectRedirect = extractRedirectUri(oauthUrl);

  const redirectPreviewOk = preview.redirectUri === EXPECTED_REDIRECT;
  const redirectConnectOk = decodeURIComponent(connectRedirect || "") === EXPECTED_REDIRECT;
  const connectOk = connectRes.status >= 300 && connectRes.status < 400 && redirectConnectOk;

  console.log("preview.redirectUri:", preview.redirectUri);
  console.log("connect redirect_uri:", decodeURIComponent(connectRedirect || "(none)"));
  console.log("connect status:", connectRes.status);
  console.log("\nRedirect URI preview:", redirectPreviewOk ? "PASS" : "FAIL");
  console.log("Redirect URI connect:", redirectConnectOk ? "PASS" : "FAIL");
  console.log("Connect endpoint:", connectOk ? "PASS" : "FAIL");

  const pass = redirectPreviewOk && redirectConnectOk && connectOk;
  console.log(`\nOverall: ${pass ? "PASS" : "FAIL"}`);
  process.exit(pass ? 0 : 1);
}

main();
