import type { NextRequest } from "next/server";

export const MENUHUS_PRODUCTION_HOSTS = ["www.menuhus.com", "menuhus.com"] as const;

/** Normalize host: lowercase, trim, first x-forwarded entry, strip port. */
export function normalizePublicHostname(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  let h = raw.trim().toLowerCase();
  if (h.includes(",")) {
    h = h.split(",")[0]?.trim() ?? "";
  }
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    if (end !== -1) h = h.slice(1, end);
  } else {
    const colon = h.indexOf(":");
    if (colon !== -1 && /^\d+$/.test(h.slice(colon + 1))) {
      h = h.slice(0, colon);
    }
  }
  return h;
}

export type ResolvedRequestHosts = {
  publicHost: string;
  forwardedHost: string;
  hostHeader: string;
  urlHostname: string;
};

/**
 * Public-facing hostname for the current request.
 * Order: x-forwarded-host → host → request.url hostname.
 */
export function resolvePublicHostname(req: NextRequest): ResolvedRequestHosts {
  const forwardedHost = normalizePublicHostname(req.headers.get("x-forwarded-host"));
  const hostHeader = normalizePublicHostname(req.headers.get("host"));
  const urlHostname = normalizePublicHostname(req.nextUrl.hostname);
  const publicHost = forwardedHost || hostHeader || urlHostname;
  return { publicHost, forwardedHost, hostHeader, urlHostname };
}

export function isMenuhusProductionHost(hostname: string): boolean {
  const h = normalizePublicHostname(hostname);
  return (MENUHUS_PRODUCTION_HOSTS as readonly string[]).includes(h);
}

/** True only when the browser-facing host is a Vercel deployment subdomain. */
export function isVercelAppPublicHost(hostname: string): boolean {
  return normalizePublicHostname(hostname).endsWith(".vercel.app");
}

/**
 * Redirect away from OAuth when the user is actually on *.vercel.app.
 * Custom domain (www.menuhus.com) on Vercel production must NOT redirect —
 * internal request.url may still be *.vercel.app.
 */
export function shouldRedirectGoogleOAuthFromVercelAppHost(req: NextRequest): boolean {
  const { publicHost } = resolvePublicHostname(req);
  if (isMenuhusProductionHost(publicHost)) return false;
  return isVercelAppPublicHost(publicHost);
}

/** Temporary safe debug — no secrets, codes, or tokens. */
export function logGoogleOAuthRequestDomain(req: NextRequest): void {
  const { publicHost, forwardedHost, hostHeader, urlHostname } = resolvePublicHostname(req);
  console.info(
    JSON.stringify({
      event: "google_oauth_request_domain",
      publicHost,
      xForwardedHost: forwardedHost || null,
      host: hostHeader || null,
      requestUrlHostname: urlHostname,
      vercelEnv: process.env.VERCEL_ENV?.trim() || null,
      appUrl: process.env.APP_URL?.trim() || null,
      ts: new Date().toISOString(),
    })
  );
}

export function isMarketingProductionContext(input: {
  browserHostname?: string | null;
  vercelEnv?: string | null;
}): boolean {
  const h = normalizePublicHostname(input.browserHostname);
  if (isMenuhusProductionHost(h)) return true;
  if (input.vercelEnv?.trim() === "production" && isMenuhusProductionHost(h)) return true;
  return false;
}
