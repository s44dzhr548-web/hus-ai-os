import { randomBytes } from "crypto";
import { isGoogleAdsDeveloperTokenConfigured } from "@/lib/marketing/google-ads-developer-token";

export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
export const GOOGLE_CONNECT_PATH = "/api/integrations/google/connect";
export const GOOGLE_CALLBACK_PATH = "/api/integrations/google/callback";

export const GOOGLE_OAUTH_LINK_COOKIE = "mh_google_oauth";

export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function envTrim(name: string): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

/** redirect_uri from GOOGLE_REDIRECT_URI only — must match authorize + token exchange + Google Cloud. */
export function getGoogleOAuthRedirectUri(): string {
  return envTrim("GOOGLE_REDIRECT_URI") ?? "";
}

/** @deprecated use getGoogleOAuthRedirectUri */
export function getCanonicalGoogleRedirectUri(): string {
  return getGoogleOAuthRedirectUri();
}

export function getGoogleAdsManagerCustomerId(): string | null {
  return (
    envTrim("GOOGLE_ADS_MANAGER_CUSTOMER_ID") || envTrim("GOOGLE_ADS_LOGIN_CUSTOMER_ID")
  );
}

export function listMissingGoogleOAuthEnv(): string[] {
  const missing: string[] = [];
  if (!envTrim("GOOGLE_CLIENT_ID")) missing.push("GOOGLE_CLIENT_ID");
  if (!envTrim("GOOGLE_CLIENT_SECRET")) missing.push("GOOGLE_CLIENT_SECRET");
  if (!envTrim("GOOGLE_REDIRECT_URI")) missing.push("GOOGLE_REDIRECT_URI");
  return missing;
}

export function listGoogleOAuthConfigHints(): string[] {
  return [...listMissingGoogleOAuthEnv()];
}

export function resolveGoogleOAuthCredentials(): GoogleOAuthCredentials | null {
  if (listMissingGoogleOAuthEnv().length > 0) return null;
  return {
    clientId: envTrim("GOOGLE_CLIENT_ID")!,
    clientSecret: envTrim("GOOGLE_CLIENT_SECRET")!,
    redirectUri: envTrim("GOOGLE_REDIRECT_URI")!,
  };
}

export function isGoogleOAuthReady(): boolean {
  return Boolean(resolveGoogleOAuthCredentials());
}

export function buildGoogleOAuthAuthorizeUrl(stateKey: string): string | null {
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
    state: stateKey,
  });

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenExchangeResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    }
  | {
      ok: false;
      httpStatus: number;
      error: string;
      errorDescription?: string;
    };

/** Safe Vercel log — no code, tokens, or client_secret. */
export function logGoogleOAuthTokenExchangeError(result: {
  httpStatus: number;
  error: string;
  errorDescription?: string;
}): void {
  console.warn(
    JSON.stringify({
      event: "google_oauth_token_exchange_failed",
      httpStatus: result.httpStatus,
      error: result.error,
      error_description: result.errorDescription ?? null,
      ts: new Date().toISOString(),
    })
  );
}

export function googleOAuthFailureReasonFromGoogleError(googleError: string): string {
  if (googleError === "redirect_uri_mismatch") return "redirect_uri_mismatch";
  if (googleError === "invalid_client") return "invalid_client";
  return "token_exchange_failed";
}

export async function exchangeGoogleOAuthCode(code: string): Promise<GoogleTokenExchangeResult> {
  const creds = resolveGoogleOAuthCredentials();
  if (!creds) {
    return {
      ok: false,
      httpStatus: 0,
      error: "oauth_not_configured",
      errorDescription: "Google OAuth env incomplete",
    };
  }

  const body = new URLSearchParams({
    code: code.trim(),
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: creds.redirectUri,
    grant_type: "authorization_code",
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return {
      ok: false,
      httpStatus: 0,
      error: "network_error",
      errorDescription: "Token endpoint unreachable",
    };
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokens.access_token) {
    return {
      ok: false,
      httpStatus: tokenRes.status,
      error: tokens.error?.trim() || "unknown_error",
      errorDescription: tokens.error_description?.trim(),
    };
  }

  return {
    ok: true,
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
  if (!isGoogleAdsDeveloperTokenConfigured()) {
    return "تم ربط حساب Google، وتنتظر قراءة الحملات إضافة Google Ads Developer Token";
  }
  return null;
}

export function sanitizeGoogleRedirectOverride(override: string | null | undefined): string | null {
  if (!override?.trim()) return null;
  const v = override.trim();
  if (v.includes("ads.google.com")) return null;
  const canonical = getGoogleOAuthRedirectUri();
  if (!canonical || v !== canonical) return null;
  return v;
}

export function newGoogleOAuthLinkNonce(): string {
  return randomBytes(8).toString("hex");
}
