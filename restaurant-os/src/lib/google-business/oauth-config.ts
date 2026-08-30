import { CANONICAL_APP_ORIGIN } from "@/lib/canonical-app-url";

/** Fixed callback — never derived from request Host, VERCEL_URL, or NEXTAUTH_URL. */
export const GOOGLE_BUSINESS_CALLBACK_PATH = "/api/integrations/google-business/callback";

export const DEFAULT_GOOGLE_BUSINESS_REDIRECT_URI =
  "https://www.menuhus.com/api/integrations/google-business/callback";

export function gbpRedirectUri(): string {
  const explicit = process.env.GOOGLE_BUSINESS_REDIRECT_URI?.trim();
  if (explicit && !explicit.includes("[SENSITIVE]")) {
    return explicit.replace(/\/$/, "");
  }
  return DEFAULT_GOOGLE_BUSINESS_REDIRECT_URI;
}

export function googleBusinessReviewsUrl(params?: Record<string, string>): string {
  const url = new URL(`${CANONICAL_APP_ORIGIN}/dashboard/google-reviews`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function googleBusinessConnectUrl(params?: Record<string, string>): string {
  const url = new URL(`${CANONICAL_APP_ORIGIN}/api/integrations/google-business/connect`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function listMissingGbpOAuthEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) missing.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.MARKETING_TOKEN_SECRET?.trim()) missing.push("MARKETING_TOKEN_SECRET");
  return missing;
}
