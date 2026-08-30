/**
 * Unit checks for public host resolution (no network).
 * Run: node scripts/google-oauth-domain-qa.mjs
 */

const MENUHUS = new Set(["www.menuhus.com", "menuhus.com"]);

function normalizePublicHostname(raw) {
  if (!raw?.trim()) return "";
  let h = raw.trim().toLowerCase();
  if (h.includes(",")) h = h.split(",")[0]?.trim() ?? "";
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    if (end !== -1) h = h.slice(1, end);
  } else {
    const colon = h.indexOf(":");
    if (colon !== -1 && /^\d+$/.test(h.slice(colon + 1))) h = h.slice(0, colon);
  }
  return h;
}

function isMenuhusProductionHost(hostname) {
  return MENUHUS.has(normalizePublicHostname(hostname));
}

function isVercelAppPublicHost(hostname) {
  return normalizePublicHostname(hostname).endsWith(".vercel.app");
}

function resolvePublicHostname(headers, urlHostname) {
  const forwardedHost = normalizePublicHostname(headers["x-forwarded-host"]);
  const hostHeader = normalizePublicHostname(headers.host);
  const urlHost = normalizePublicHostname(urlHostname);
  const publicHost = forwardedHost || hostHeader || urlHost;
  return { publicHost, forwardedHost, hostHeader, urlHostname: urlHost };
}

function shouldRedirect(headers, urlHostname) {
  const { publicHost } = resolvePublicHostname(headers, urlHostname);
  if (isMenuhusProductionHost(publicHost)) return false;
  return isVercelAppPublicHost(publicHost);
}

function assert(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let all = true;
all =
  assert("normalize strips port", normalizePublicHostname("WWW.MenuHus.COM:443") === "www.menuhus.com") &&
  all;
all =
  assert(
    "normalize forwarded first host",
    normalizePublicHostname("www.menuhus.com, internal.vercel.app") === "www.menuhus.com"
  ) && all;
all = assert("www.menuhus.com is production", isMenuhusProductionHost("www.menuhus.com")) && all;
all = assert("menuhus.com is production", isMenuhusProductionHost("menuhus.com")) && all;
all =
  assert("vercel.app is preview host", isVercelAppPublicHost("restaurant-os-nine.vercel.app")) && all;
all =
  assert(
    "www.menuhus.com on Vercel production allows OAuth",
    !shouldRedirect(
      { "x-forwarded-host": "www.menuhus.com", host: "restaurant-abc.vercel.app" },
      "restaurant-abc.vercel.app"
    )
  ) && all;
all =
  assert(
    "vercel.app public host blocks OAuth",
    shouldRedirect(
      { "x-forwarded-host": "restaurant-os-nine.vercel.app", host: "restaurant-os-nine.vercel.app" },
      "restaurant-os-nine.vercel.app"
    )
  ) && all;
all =
  assert("menuhus.com allows OAuth", !shouldRedirect({ host: "menuhus.com" }, "menuhus.com")) && all;

process.exit(all ? 0 : 1);
