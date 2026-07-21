#!/usr/bin/env node
/**
 * Meta Ads platform card + connect button QA.
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

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

async function main() {
  console.log(`Meta platform card QA @ ${BASE}\n`);
  let cookie = await login();
  cookie = await switchFabrika(cookie);

  const platforms = await json(
    await fetch(`${BASE}/api/marketing/platforms`, { headers: { Cookie: cookie } })
  );
  const meta = (platforms.platforms || []).find((p) => p.key === "META");
  console.log("Meta state:", meta?.connectionState, "|", meta?.connectionStateLabel);
  console.log("showConnectButton:", meta?.showConnectButton);
  console.log("connectUrl:", meta?.connectUrl);
  console.log("canConnect:", platforms.permissions?.canConnect);

  const pageRes = await fetch(`${BASE}/dashboard/marketing/platforms`, {
    headers: { Cookie: cookie },
  });
  const html = await pageRes.text();
  const hasConnectLabel =
    html.includes("ربط حساب Meta") || html.includes('data-testid="meta-ads-connect-button"');

  const connectRes = await fetch(`${BASE}/api/integrations/meta/connect`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const connectOk =
    (connectRes.status >= 300 && connectRes.status < 400) ||
    (connectRes.status === 503 && meta?.connectionState === "NOT_CONFIGURED") ||
    (connectRes.status === 403 && !platforms.permissions?.canConnect);

  console.log("\nPage has connect button label:", hasConnectLabel ? "yes" : "no");
  console.log("Connect endpoint:", connectRes.status, connectRes.headers.get("location")?.slice(0, 80) || "");

  const buttonPass =
    meta?.connectionState === "NOT_CONFIGURED"
      ? !meta?.showConnectButton
      : meta?.showConnectButton && meta?.connectUrl === "/api/integrations/meta/connect";

  console.log(`\nConnect button logic: ${buttonPass ? "PASS" : "FAIL"}`);
  console.log(`Connect endpoint: ${connectOk ? "PASS" : "FAIL"}`);
  process.exit(buttonPass && connectOk ? 0 : 1);
}

main();
