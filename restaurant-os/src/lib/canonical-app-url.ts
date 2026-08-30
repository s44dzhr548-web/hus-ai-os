/** Fixed production origin for Google OAuth redirects — not derived from request Host or VERCEL_URL. */

function resolveCanonicalAppOrigin(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw && !raw.includes("[SENSITIVE]")) {
    try {
      return new URL(raw).origin.replace(/\/$/, "");
    } catch {
      /* fall through */
    }
  }
  return "https://www.menuhus.com";
}

export const CANONICAL_APP_ORIGIN = resolveCanonicalAppOrigin();



export const GOOGLE_OAUTH_CALLBACK_URL =

  "https://www.menuhus.com/api/integrations/google/callback";



export function googleMarketingPlatformsUrl(params?: Record<string, string>): string {

  const url = new URL(`${CANONICAL_APP_ORIGIN}/dashboard/marketing/platforms`);

  if (params) {

    for (const [key, value] of Object.entries(params)) {

      if (value) url.searchParams.set(key, value);

    }

  }

  return url.toString();

}



/** @deprecated use shouldRedirectGoogleOAuthFromVercelAppHost(req) */

export function isVercelPreviewHostname(hostname: string): boolean {

  return hostname.endsWith(".vercel.app");

}



export {

  isMenuhusProductionHost,

  isVercelAppPublicHost,

  logGoogleOAuthRequestDomain,

  normalizePublicHostname,

  resolvePublicHostname,

  shouldRedirectGoogleOAuthFromVercelAppHost,

} from "@/lib/request-public-host";


