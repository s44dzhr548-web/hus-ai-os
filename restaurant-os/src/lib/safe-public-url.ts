const PLACEHOLDER_MARKERS = ["[SENSITIVE]", "placeholder", "[YOUR-PASSWORD]"];

export function isSafePublicUrl(raw: string | undefined | null): boolean {
  if (!raw?.trim()) return false;
  const val = raw.trim();
  if (PLACEHOLDER_MARKERS.some((m) => val.includes(m))) return false;
  try {
    const u = new URL(val);
    return Boolean(u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function safePublicOrigin(fallback = "https://www.menuhus.com"): string {
  for (const key of ["NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "APP_URL"] as const) {
    const raw = process.env[key];
    if (!isSafePublicUrl(raw)) continue;
    return new URL(raw!.trim()).origin.replace(/\/$/, "");
  }
  return fallback.replace(/\/$/, "");
}

export function safePublicBaseUrl(fallback = "https://www.menuhus.com"): string {
  return safePublicOrigin(fallback);
}
