import type { MarketingPlatform } from "@prisma/client";
import {
  getMetaAdsOAuthRedirectUri,
  isValidMetaAppId,
  resolveMetaAdsEnvCredentials,
} from "@/lib/platform/meta-ads-env";
import { resolveAdsIntegration } from "@/lib/platform/ads-integrations";
import { buildOAuthState } from "@/lib/marketing/ads-oauth";

const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const META_GRAPH = "https://graph.facebook.com/v21.0";
const META_SCOPES = ["ads_management", "ads_read", "business_management"];

export type MetaOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type MetaAdAccountRecord = {
  accountId: string;
  accountName: string;
  businessId: string | null;
  businessName: string | null;
  currency: string | null;
  timezone: string | null;
};

export type MetaTokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
};

/** Read META_APP_ID, META_APP_SECRET, META_ADS_REDIRECT_URI (with DB/env fallbacks). */
export async function resolveMetaOAuthCredentials(): Promise<MetaOAuthCredentials | null> {
  const env = resolveMetaAdsEnvCredentials();
  const integration = await resolveAdsIntegration("META");

  const clientId =
    (env.clientId && isValidMetaAppId(env.clientId) ? env.clientId : null) ||
    (integration.clientId && isValidMetaAppId(integration.clientId) ? integration.clientId : null);

  const clientSecret = env.clientSecret || integration.clientSecret;
  const redirectUri = env.redirectUri || integration.redirectUri || getMetaAdsOAuthRedirectUri();

  if (!clientId || !clientSecret) return null;

  return { clientId, clientSecret, redirectUri };
}

export async function isMetaOAuthReady(): Promise<boolean> {
  return Boolean(await resolveMetaOAuthCredentials());
}

export async function buildMetaOAuthAuthorizeUrl(restaurantId: string): Promise<string | null> {
  const creds = await resolveMetaOAuthCredentials();
  if (!creds) return null;

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    scope: META_SCOPES.join(","),
    state: buildOAuthState(restaurantId, "META" as MarketingPlatform),
    response_type: "code",
  });

  return `${META_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMetaOAuthCode(code: string): Promise<MetaTokenBundle> {
  const creds = await resolveMetaOAuthCredentials();
  if (!creds) throw new Error("Meta OAuth غير مهيأ");

  const tokenRes = await fetch(META_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: creds.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens.error?.message || "فشل تبادل رمز OAuth");
  }

  const longRes = await fetch(
    `${META_GRAPH}/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      fb_exchange_token: tokens.access_token,
    })}`
  );
  const long = (await longRes.json()) as { access_token?: string; expires_in?: number };

  return {
    accessToken: long.access_token || tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresIn: long.expires_in || tokens.expires_in || null,
  };
}

export async function fetchMetaAdAccounts(accessToken: string): Promise<MetaAdAccountRecord[]> {
  const res = await fetch(
    `${META_GRAPH}/me/adaccounts?fields=id,name,account_id,currency,timezone_name,business{id,name}&limit=50&access_token=${encodeURIComponent(accessToken)}`
  );
  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      account_id?: string;
      currency?: string;
      timezone_name?: string;
      business?: { id?: string; name?: string };
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || "تعذّر جلب حسابات الإعلانات");
  }

  return (data.data || []).map((acct) => ({
    accountId: acct.account_id || acct.id.replace(/^act_/, ""),
    accountName: acct.name || acct.business?.name || "Meta Ad Account",
    businessId: acct.business?.id || null,
    businessName: acct.business?.name || acct.name || null,
    currency: acct.currency || null,
    timezone: acct.timezone_name || null,
  }));
}

export function metaConnectionMetadata(account: MetaAdAccountRecord) {
  return {
    businessId: account.businessId,
    adAccountId: account.accountId,
    businessName: account.businessName,
    accountName: account.accountName,
    currency: account.currency,
    timezone: account.timezone,
  };
}
