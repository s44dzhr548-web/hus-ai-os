/**
 * GBP OAuth must use www.menuhus.com callback in production.
 * Usage: node scripts/gbp-oauth-redirect-qa.mjs
 */
const MENUHUS = "https://www.menuhus.com/api/integrations/google-business/callback";
const VERCEL = process.argv[2] || "https://restaurant-os-nine.vercel.app";

async function head(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") || "" };
}

let ok = true;
function assert(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) ok = false;
}

const cb = await head(`${VERCEL}/api/integrations/google-business/callback?code=x&state=y`);
assert(
  "vercel callback forwards to menuhus",
  cb.status === 307 && cb.location.startsWith(MENUHUS),
  cb.location.slice(0, 80)
);

const connect = await head(`${VERCEL}/api/integrations/google-business/connect`);
assert(
  "vercel connect forwards to menuhus",
  connect.status === 307 && connect.location.includes("www.menuhus.com/api/integrations/google-business/connect"),
  connect.location.slice(0, 80)
);

process.exit(ok ? 0 : 1);
