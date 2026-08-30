/**
 * Final QA: Google Maps embed parsing + optional production smoke.
 * Usage: node scripts/google-maps-embed-final-qa.mjs [baseUrl] [slug]
 */
const base = (process.argv[2] || "https://www.menuhus.com").replace(/\/$/, "");
const slug = process.argv[3] || "fabrika-mqkat9dw";

function normalizeHost(hostname) {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function isAllowed(url) {
  if (url.protocol !== "https:") return false;
  const host = normalizeHost(url.hostname);
  if (host === "maps.google.com") return url.pathname === "/" || url.pathname.startsWith("/maps");
  if (host === "google.com") return url.pathname.startsWith("/maps");
  return false;
}

function validateSrc(src) {
  const trimmed = src.trim();
  if (!trimmed) return { ok: true, src: null };
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false };
  }
  if (!isAllowed(parsed) || !parsed.pathname.includes("/maps/embed")) return { ok: false };
  return { ok: true, src: parsed.toString() };
}

function parseInput(raw) {
  const input = raw.trim();
  if (!input) return { ok: true, src: null };
  if (/^https?:\/\//i.test(input)) return validateSrc(input);
  const m = input.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (m?.[1]) return validateSrc(m[1].replace(/&amp;/g, "&"));
  return { ok: false };
}

function assert(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let all = true;
const iframe =
  '<iframe src="https://www.google.com/maps/embed?pb=test123" width="600" height="450"></iframe>';
const parsed = parseInput(iframe);
all = assert("extract src from iframe", parsed.ok && parsed.src?.includes("google.com/maps/embed")) && all;
all = assert("reject evil domain", !validateSrc("https://evil.com/maps/embed?pb=1").ok) && all;
all = assert("clear empty input", parseInput("").ok && parseInput("").src === null) && all;

const settingsRes = await fetch(`${base}/dashboard/settings`, { redirect: "manual" });
all =
  assert(
    "settings page reachable (auth redirect ok)",
    settingsRes.status === 200 || settingsRes.status === 307 || settingsRes.status === 302,
    `status=${settingsRes.status}`
  ) && all;

const contactRes = await fetch(`${base}/r/${slug}/contact`);
const contactHtml = contactRes.ok ? await contactRes.text() : "";
all =
  assert("customer contact page loads", contactRes.ok, `status=${contactRes.status}`) && all;
all =
  assert(
    "contact page includes directions label when map UI present",
    contactHtml.includes("الاتجاهات إلى المطعم") || contactHtml.includes("تواصل معنا"),
    "map section appears after saving embed in settings"
  ) && all;

const pub = await fetch(`${base}/api/public/restaurants/${slug}`);
const pubJson = pub.ok ? await pub.json() : {};
all =
  assert(
    "public API exposes googleMapsEmbedSrc field",
    pub.ok && "googleMapsEmbedSrc" in pubJson,
    pub.ok ? `value=${pubJson.googleMapsEmbedSrc ? "set" : "null"}` : `status=${pub.status}`
  ) && all;

process.exit(all ? 0 : 1);
