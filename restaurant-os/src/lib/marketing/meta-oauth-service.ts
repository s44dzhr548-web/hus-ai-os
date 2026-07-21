import type { MarketingPlatform } from "@prisma/client";
import {
  getCanonicalMetaRedirectUri,
  isValidMetaAppId,
} from "@/lib/platform/meta-ads-env";
import { buildOAuthState } from "@/lib/marketing/ads-oauth";
import { MetaOAuthError } from "@/lib/marketing/meta-oauth-errors";
import { logMetaOAuthStage, sanitizeGraphErrorMessage } from "@/lib/marketing/meta-oauth-callback-log";

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

export type MetaBusinessRecord = {
  businessId: string;
  businessName: string;
};

export type MetaTokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
};

function firstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

/** OAuth uses META_APP_ID, META_APP_SECRET, META_ADS_REDIRECT_URI only — same values for connect + callback. */
export function resolveMetaOAuthCredentials(): MetaOAuthCredentials | null {
  const clientId = firstEnv(["META_APP_ID", "META_ADS_CLIENT_ID"]);
  const clientSecret = firstEnv(["META_APP_SECRET", "META_ADS_CLIENT_SECRET"]);
  const redirectUri = getCanonicalMetaRedirectUri();

  if (!clientId || !isValidMetaAppId(clientId) || !clientSecret) return null;

  return { clientId, clientSecret, redirectUri };
}

export async function isMetaOAuthReady(): Promise<boolean> {
  return Boolean(resolveMetaOAuthCredentials());
}

export async function buildMetaOAuthAuthorizeUrl(restaurantId: string): Promise<string | null> {
  const creds = resolveMetaOAuthCredentials();
  if (!creds) return null;

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    scope: META_SCOPES.join(","),
    state: buildOAuthState(restaurantId, "META" as MarketingPlatform),
    response_type: "code",
  });

  logMetaOAuthStage("connect_authorize_url", {
    redirectUri: creds.redirectUri,
    appIdSuffix: creds.clientId.slice(-4),
  });

  return `${META_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMetaOAuthCode(code: string): Promise<MetaTokenBundle> {
  const creds = resolveMetaOAuthCredentials();
  if (!creds) {
    throw new MetaOAuthError("token_exchange_failed", "Meta OAuth env vars missing");
  }

  logMetaOAuthStage("token_exchange_start", {
    redirectUri: creds.redirectUri,
    codeLength: code.length,
  });

  const tokenParams = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: creds.redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(`${META_TOKEN_URL}?${tokenParams.toString()}`);
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: { message?: string; type?: string; code?: number };
  };

  if (!tokenRes.ok || !tokens.access_token) {
    const detail = sanitizeGraphErrorMessage(tokens.error?.message);
    logMetaOAuthStage("token_exchange_failed", {
      httpStatus: tokenRes.status,
      graphErrorType: tokens.error?.type ?? null,
      graphErrorCode: tokens.error?.code ?? null,
      graphMessage: detail ?? null,
      redirectUri: creds.redirectUri,
    });
    throw new MetaOAuthError(
      "token_exchange_failed",
      detail || "Token exchange failed",
      detail
    );
  }

  logMetaOAuthStage("token_exchange_ok", {
    hasRefreshToken: Boolean(tokens.refresh_token),
    expiresIn: tokens.expires_in ?? null,
  });

  let accessToken = tokens.access_token;
  let expiresIn = tokens.expires_in ?? null;

  try {
    const longParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      fb_exchange_token: tokens.access_token,
    });
    const longRes = await fetch(`${META_GRAPH}/oauth/access_token?${longParams.toString()}`);
    const long = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (longRes.ok && long.access_token) {
      accessToken = long.access_token;
      expiresIn = long.expires_in ?? expiresIn;
      logMetaOAuthStage("long_lived_token_ok", { expiresIn });
    } else {
      logMetaOAuthStage("long_lived_token_skipped", {
        httpStatus: longRes.status,
        graphMessage: sanitizeGraphErrorMessage(long.error?.message) ?? null,
      });
    }
  } catch {
    logMetaOAuthStage("long_lived_token_skipped", { reason: "network_error" });
  }

  return {
    accessToken,
    refreshToken: tokens.refresh_token || null,
    expiresIn,
  };
}

export async function fetchMetaBusinesses(accessToken: string): Promise<MetaBusinessRecord[]> {
  const res = await fetch(
    `${META_GRAPH}/me/businesses?fields=id,name&limit=50&access_token=${encodeURIComponent(accessToken)}`
  );
  const data = (await res.json()) as {
    data?: Array<{ id: string; name?: string }>;
    error?: { message?: string; type?: string; code?: number };
  };

  if (data.error) {
    const detail = sanitizeGraphErrorMessage(data.error.message);
    logMetaOAuthStage("graph_businesses_error", {
      httpStatus: res.status,
      graphErrorType: data.error.type ?? null,
      graphErrorCode: data.error.code ?? null,
      graphMessage: detail ?? null,
    });
    throw new MetaOAuthError("graph_api_failed", detail || "Graph businesses failed", detail);
  }

  const businesses = (data.data || []).map((b) => ({
    businessId: b.id,
    businessName: b.name || "Business",
  }));

  logMetaOAuthStage("graph_businesses_ok", { count: businesses.length });

  return businesses;
}

async function fetchOwnedAdAccountsForBusiness(
  businessId: string,
  accessToken: string
): Promise<MetaAdAccountRecord[]> {
  const res = await fetch(
    `${META_GRAPH}/${businessId}/owned_ad_accounts?fields=id,name,account_id,currency,timezone_name,business{id,name}&limit=50&access_token=${encodeURIComponent(accessToken)}`
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

  if (data.error) return [];

  return (data.data || []).map((acct) => ({
    accountId: acct.account_id || acct.id.replace(/^act_/, ""),
    accountName: acct.name || acct.business?.name || "Meta Ad Account",
    businessId: acct.business?.id || businessId,
    businessName: acct.business?.name || acct.name || null,
    currency: acct.currency || null,
    timezone: acct.timezone_name || null,
  }));
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
    error?: { message?: string; type?: string; code?: number };
  };

  if (data.error) {
    const detail = sanitizeGraphErrorMessage(data.error.message);
    logMetaOAuthStage("graph_ad_accounts_error", {
      httpStatus: res.status,
      graphErrorType: data.error.type ?? null,
      graphErrorCode: data.error.code ?? null,
      graphMessage: detail ?? null,
    });
    throw new MetaOAuthError("graph_api_failed", detail || "Graph ad accounts failed", detail);
  }

  let accounts = (data.data || []).map((acct) => ({
    accountId: acct.account_id || acct.id.replace(/^act_/, ""),
    accountName: acct.name || acct.business?.name || "Meta Ad Account",
    businessId: acct.business?.id || null,
    businessName: acct.business?.name || acct.name || null,
    currency: acct.currency || null,
    timezone: acct.timezone_name || null,
  }));

  if (accounts.length === 0) {
    logMetaOAuthStage("graph_ad_accounts_empty_try_businesses");
    const businesses = await fetchMetaBusinesses(accessToken);
    for (const business of businesses) {
      const owned = await fetchOwnedAdAccountsForBusiness(business.businessId, accessToken);
      accounts = accounts.concat(owned);
    }
  }

  logMetaOAuthStage("graph_ad_accounts_ok", { count: accounts.length });

  return accounts;
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
