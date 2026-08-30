/** @typedef {import('../src/lib/google-maps-embed.ts')} */

// Inline validation tests (mirrors src/lib/google-maps-embed.ts)
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

const sample =
  '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3709.660428389903!2d39.121784!3d21.599174099999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x15c3db09577bea69%3A0x6cc9009110d49355!2z2YHYp9io2LHZitmD2Kcg2YXYt9i52YUg2YjZhNin2YjZhtis!5e0!3m2!1sar!2ssa!4v1785136349110!5m2!1sar!2ssa" width="600" height="450"></iframe>';

function extractLatLngFromPb(pb) {
  const m23 = pb.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (m23) return { lat: Number(m23[2]), lng: Number(m23[1]) };
  const m34 = pb.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m34) return { lat: Number(m34[1]), lng: Number(m34[2]) };
  return null;
}

function buildDirections(embedSrc) {
  const u = new URL(embedSrc);
  const pb = u.searchParams.get("pb") ?? "";
  const c = extractLatLngFromPb(pb);
  if (c) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.lat},${c.lng}`)}`;
  }
  return `https://www.google.com/maps?pb=${encodeURIComponent(pb)}`;
}

let ok = true;
ok = parseInput(sample).ok && ok;
ok = validateSrc("https://evil.com/maps/embed?pb=1").ok === false && ok;
ok = parseInput("").ok && parseInput("").src === null && ok;

const fabSrc = parseInput(sample).src;
const dir = buildDirections(fabSrc);
ok =
  dir.includes("destination=21.599174") &&
  dir.includes("39.121784") &&
  !dir.includes("maps/embed") &&
  !dir.includes("destination=https%3A") &&
  ok;

console.log(ok ? "PASS google-maps-embed-qa" : "FAIL google-maps-embed-qa");
process.exit(ok ? 0 : 1);
