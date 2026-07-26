import type { MarketingPlatform } from "@prisma/client";
import { buildOAuthState } from "@/lib/marketing/ads-oauth";

export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CONNECT_PATH = "/api/integrations/google/connect";
export const GOOGLE_CALLBACK_PATH = "/api/integrations/google/callback";

export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function firstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

/** Canonical callback — must match Google Cloud OAuth client authorized redirect URIs. */
export function getCanonicalGoogleRedirectUri(): string {
  return (
    firstEnv(["GOOGLE_REDIRECT_URI", "GOOGLE_ADS_REDIRECT_URI"]) ||
    "https://www.menuhus.com/api/integrations/google/callback"
  );
}

export function resolveGoogleOAuthCredentials(): GoogleOAuthCredentials | null {
  const clientId = firstEnv(["GOOGLE_CLIENT_ID", "GOOGLE_ADS_CLIENT_ID"]);
  const clientSecret = firstEnv(["GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_CLIENT_SECRET"]);
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: getCanonicalGoogleRedirectUri(),
  };
}

export function isGoogleOAuthReady(): boolean {
  return Boolean(resolveGoogleOAuthCredentials());
}

export function buildGoogleOAuthAuthorizeUrl(restaurantId: string): string | null {
  const creds = resolveGoogleOAuthCredentials();
  if (!creds) return null;

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    scope: GOOGLE_ADS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: buildOAuthState(restaurantId, "GOOGLE" as MarketingPlatform),
  });

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleOAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const creds = resolveGoogleOAuthCredentials();
  if (!creds) throw new Error("Google OAuth غير مهيأ");

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    redirect_uri: creds.redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || tokens.error || "فشل تبادل رمز Google");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

export function googleOAuthPostConnectMessage(): string | null {
  const hasDev =
    Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()) ||
    Boolean(process.env.GOOGLE_DEVELOPER_TOKEN?.trim());
  if (!hasDev) {
    return "تم ربط Google Ads — قراءة الحملات تنتظر إضافة GOOGLE_ADS_DEVELOPER_TOKEN على الخادم";
  }
  return null;
}
