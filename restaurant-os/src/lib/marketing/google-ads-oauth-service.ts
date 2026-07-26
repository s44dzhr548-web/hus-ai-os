import { randomBytes } from "crypto";
import type { MarketingPlatform } from "@prisma/client";

export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
export const GOOGLE_CONNECT_PATH = "/api/integrations/google/connect";
export const GOOGLE_CALLBACK_PATH = "/api/integrations/google/callback";
export const DEFAULT_GOOGLE_CALLBACK =
  "https://www.menuhus.com/api/integrations/google/callback";

const STATE_MAX_AGE_MS = 20 * 60 * 1000;

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
    firstEnv(["GOOGLE_REDIRECT_URI", "GOOGLE_ADS_REDIRECT_URI"]) || DEFAULT_GOOGLE_CALLBACK
  );
}

export function getGoogleAdsManagerCustomerId(): string | null {
  return firstEnv(["GOOGLE_ADS_MANAGER_CUSTOMER_ID", "GOOGLE_ADS_LOGIN_CUSTOMER_ID"]);
}

/** Env keys missing for OAuth (names only — never values). */
export function listMissingGoogleOAuthEnv(): string[] {
  const missing: string[] = [];
  if (!firstEnv(["GOOGLE_CLIENT_ID", "GOOGLE_ADS_CLIENT_ID"])) {
    missing.push("GOOGLE_CLIENT_ID");
  }
  if (!firstEnv(["GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_CLIENT_SECRET"])) {
    missing.push("GOOGLE_CLIENT_SECRET");
  }
  return missing;
}

/** Optional config hints (redirect URI uses default when unset). */
export function listGoogleOAuthConfigHints(): string[] {
  const hints = [...listMissingGoogleOAuthEnv()];
  if (!firstEnv(["GOOGLE_REDIRECT_URI", "GOOGLE_ADS_REDIRECT_URI"])) {
    hints.push("GOOGLE_REDIRECT_URI");
  }
  return hints;
}

export function resolveGoogleOAuthCredentials(): GoogleOAuthCredentials | null {
  if (listMissingGoogleOAuthEnv().length > 0) return null;
  const clientId = firstEnv(["GOOGLE_CLIENT_ID", "GOOGLE_ADS_CLIENT_ID"])!;
  const clientSecret = firstEnv(["GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_CLIENT_SECRET"])!;
  return {
    clientId,
    clientSecret,
    redirectUri: getCanonicalGoogleRedirectUri(),
  };
}

export function isGoogleOAuthReady(): boolean {
  return Boolean(resolveGoogleOAuthCredentials());
}

export function buildGoogleOAuthState(restaurantId: string, userId: string): string {
  return Buffer.from(
    JSON.stringify({
      restaurantId,
      platform: "GOOGLE",
      userId,
      ts: Date.now(),
      n: randomBytes(12).toString("hex"),
    })
  ).toString("base64url");
}

export function parseGoogleOAuthState(state: string): {
  restaurantId: string;
  platform: MarketingPlatform;
  userId?: string;
  ts?: number;
} | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (!parsed.restaurantId || parsed.platform !== "GOOGLE") return null;
    if (parsed.ts && Date.now() - Number(parsed.ts) > STATE_MAX_AGE_MS) return null;
    return {
      restaurantId: parsed.restaurantId,
      platform: "GOOGLE",
      userId: typeof parsed.userId === "string" ? parsed.userId : undefined,
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}

export function buildGoogleOAuthAuthorizeUrl(restaurantId: string, userId: string): string | null {
  const creds = resolveGoogleOAuthCredentials();
  if (!creds) return null;

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    scope: GOOGLE_ADS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: buildGoogleOAuthState(restaurantId, userId),
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

export async function fetchGoogleAuthorizedProfile(accessToken: string): Promise<{
  email: string | null;
  name: string | null;
}> {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { email: null, name: null };
    const data = (await res.json()) as { email?: string; name?: string };
    return { email: data.email ?? null, name: data.name ?? null };
  } catch {
    return { email: null, name: null };
  }
}

export function googleOAuthPostConnectMessage(): string | null {
  const hasDev =
    Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()) ||
    Boolean(process.env.GOOGLE_DEVELOPER_TOKEN?.trim());
  if (!hasDev) {
    return "تم ربط حساب Google، وتنتظر قراءة الحملات إضافة Google Ads Developer Token";
  }
  return null;
}

/** Reject unsafe redirect overrides (e.g. ads.google.com console URLs). */
export function sanitizeGoogleRedirectOverride(override: string | null | undefined): string | null {
  if (!override?.trim()) return null;
  const v = override.trim();
  if (v.includes("ads.google.com")) return null;
  if (!v.includes("/api/integrations/google/callback")) return null;
  return v;
}
