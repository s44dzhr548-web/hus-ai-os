/**
 * Google Maps embed iframe — extract and validate src only (no arbitrary HTML).
 * No Google Cloud API / billing required.
 */

export type GoogleMapsEmbedParseResult =
  | { ok: true; src: string | null }
  | { ok: false; error: string };

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

/** Allowed: google.com/maps/* or maps.google.com/* (https only). */
export function isAllowedGoogleMapsEmbedUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = normalizeHost(url.hostname);
  if (host === "maps.google.com") {
    return url.pathname === "/" || url.pathname.startsWith("/maps");
  }
  if (host === "google.com") {
    return url.pathname.startsWith("/maps");
  }
  return false;
}

export function validateGoogleMapsEmbedSrc(src: string): GoogleMapsEmbedParseResult {
  let trimmed = src.trim();
  if (trimmed.startsWith("//")) trimmed = `https:${trimmed}`;

  if (!trimmed) return { ok: true, src: null };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "رابط الخريطة غير صالح" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "يجب أن يكون رابط التضمين https" };
  }

  if (!isAllowedGoogleMapsEmbedUrl(parsed)) {
    return {
      ok: false,
      error: "يجب أن يكون الرابط من google.com/maps أو maps.google.com فقط",
    };
  }

  const isEmbedPath =
    parsed.pathname.includes("/maps/embed") ||
    (parsed.pathname.includes("/maps") && parsed.searchParams.get("output") === "embed");

  if (!isEmbedPath) {
    return {
      ok: false,
      error: "استخدم رابط التضمين من Google Maps (مشاركة → تضمين خريطة)",
    };
  }

  return { ok: true, src: parsed.toString() };
}

/** Accept pasted iframe HTML or raw embed https URL; returns stored src only. */
export function parseGoogleMapsEmbedInput(input: string): GoogleMapsEmbedParseResult {
  const raw = input.trim();
  if (!raw) return { ok: true, src: null };

  if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    return validateGoogleMapsEmbedSrc(raw);
  }

  const srcMatch =
    raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i) ||
    raw.match(/\bsrc\s*=\s*([^\s>]+)/i);
  if (srcMatch?.[1]) {
    const decoded = srcMatch[1].replace(/&amp;/g, "&").trim();
    return validateGoogleMapsEmbedSrc(decoded);
  }

  return {
    ok: false,
    error: "الصق كود iframe من Google Maps أو رابط src مباشرة",
  };
}

/** Lat/lng from Google Maps embed `pb` or query (not for storage — directions only). */
export function extractLatLngFromGoogleMapsEmbed(
  embedSrc: string
): { lat: number; lng: number } | null {
  const trimmed = embedSrc.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
    const pb = u.searchParams.get("pb") ?? "";

    // Marker position: !3d{lat}!4d{lng}
    const m34 = pb.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m34) {
      return { lat: Number(m34[1]), lng: Number(m34[2]) };
    }

    // Common embed layout: !2d{lng}!3d{lat} (Fabrika and many place embeds)
    const m23 = pb.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
    if (m23) {
      return { lat: Number(m23[2]), lng: Number(m23[1]) };
    }

    const at = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) {
      return { lat: Number(at[1]), lng: Number(at[2]) };
    }

    const q = u.searchParams.get("q");
    if (q) {
      const coordQ = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
      if (coordQ) {
        return { lat: Number(coordQ[1]), lng: Number(coordQ[2]) };
      }
    }
  } catch {
    /* fall through */
  }

  return null;
}

/** Regular Google Maps place URL (not /maps/embed) for fallback navigation. */
export function buildGoogleMapsPlaceFallbackUrl(embedSrc: string): string {
  try {
    const u = new URL(embedSrc.trim());
    const pb = u.searchParams.get("pb");
    if (pb) {
      return `https://www.google.com/maps?pb=${encodeURIComponent(pb)}`;
    }
    const q = u.searchParams.get("q");
    if (q) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
  } catch {
    /* below */
  }
  return "https://www.google.com/maps";
}

/** Directions: destination as lat,lng only — never the embed URL. */
export function buildGoogleMapsDirectionsUrl(embedSrc: string): string {
  const coords = extractLatLngFromGoogleMapsEmbed(embedSrc);
  if (coords) {
    const dest = `${coords.lat},${coords.lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  }
  return buildGoogleMapsPlaceFallbackUrl(embedSrc);
}
