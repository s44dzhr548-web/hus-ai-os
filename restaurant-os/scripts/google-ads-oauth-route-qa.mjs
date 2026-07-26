/**
 * Verify Google Ads OAuth connect route (no secrets).
 * Usage: node scripts/google-ads-oauth-route-qa.mjs [baseUrl]
 */
const base = (process.argv[2] || "https://www.menuhus.com").replace(/\/$/, "");

function assert(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

const connectUrl = `${base}/api/integrations/google/connect`;
const res = await fetch(connectUrl, { redirect: "manual" });
const loc = res.headers.get("location") || "";

const notAdsConsole = !loc.includes("ads.google.com/aw/accountaccess");
const isOAuthOrAuth =
  res.status === 307 ||
  res.status === 302 ||
  res.status === 401 ||
  res.status === 403 ||
  loc.includes("accounts.google.com/o/oauth2");

assert("connect route does not redirect to ads accountaccess UI", notAdsConsole, loc.slice(0, 80));
assert(
  "connect route is OAuth or auth-gated",
  isOAuthOrAuth,
  `status=${res.status}`
);

process.exit(notAdsConsole && isOAuthOrAuth ? 0 : 1);
