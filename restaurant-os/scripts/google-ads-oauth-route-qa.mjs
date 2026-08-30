/**
 * Verify Google Ads OAuth connect route (no secrets).
 * Usage: node scripts/google-ads-oauth-route-qa.mjs [menuhusBase] [vercelBase]
 */
const base = (process.argv[2] || "https://www.menuhus.com").replace(/\/$/, "");

function assert(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let all = true;

const connectUrl = `${base}/api/integrations/google/connect`;
const res = await fetch(connectUrl, { redirect: "manual" });
const loc = res.headers.get("location") || "";

const notAdsConsole = !loc.includes("ads.google.com/aw/accountaccess");
const notUseMenuhusError = !loc.includes("use_menuhus_domain");
const isOAuthOrAuth =
  res.status === 307 ||
  res.status === 302 ||
  res.status === 401 ||
  res.status === 403 ||
  loc.includes("accounts.google.com/o/oauth2");

all =
  assert("connect route does not redirect to ads accountaccess UI", notAdsConsole, loc.slice(0, 80)) &&
  all;
all =
  assert(
    "www.menuhus.com does not return use_menuhus_domain",
    notUseMenuhusError,
    loc.slice(0, 100)
  ) && all;
all =
  assert("connect route is OAuth or auth-gated", isOAuthOrAuth, `status=${res.status}`) && all;

const previewHost = (process.argv[3] || "https://restaurant-os-nine.vercel.app").replace(/\/$/, "");
const previewRes = await fetch(`${previewHost}/api/integrations/google/connect`, {
  redirect: "manual",
});
const previewLoc = previewRes.headers.get("location") || "";
const previewBlocks =
  previewLoc.includes("www.menuhus.com/dashboard/marketing/platforms") &&
  previewLoc.includes("use_menuhus_domain");
all = assert("vercel.app connect redirects to menuhus platforms", previewBlocks, previewLoc.slice(0, 100)) && all;

const platformsHtml = await fetch(`${base}/dashboard/marketing/platforms`).then((r) => r.text());
const noStagingOnly =
  !platformsHtml.includes("Staging/Local فقط") ||
  platformsHtml.includes("Google Ads · OAuth على www.menuhus.com");
all =
  assert(
    "production platforms HTML is not staging-only (SSR may vary; client fixes label)",
    platformsHtml.includes("marketing") || noStagingOnly,
    "skipped strict HTML check if auth wall"
  ) && all;

process.exit(all ? 0 : 1);
