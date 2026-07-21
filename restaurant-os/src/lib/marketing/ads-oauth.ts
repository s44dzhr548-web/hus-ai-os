import type { MarketingPlatform } from "@prisma/client";
import {
  ADS_INTEGRATION_DEFS,
  type AdsIntegrationKey,
  resolveAdsIntegration,
  isAdsIntegrationReady,
  getAdsOAuthRedirectUri,
} from "@/lib/platform/ads-integrations";
import { encryptToken, decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";

const GRAPH = "https://graph.facebook.com/v21.0";

export type DiscoveredAdAccount = {
  accountId: string;
  accountName: string;
  businessName: string | null;
  currency: string | null;
  timezone: string | null;
};

export function platformToIntegrationKey(platform: MarketingPlatform): AdsIntegrationKey | null {
  const map: Partial<Record<MarketingPlatform, AdsIntegrationKey>> = {
    META: "META",
    FACEBOOK: "META",
    INSTAGRAM: "META",
    GOOGLE: "GOOGLE",
    YOUTUBE: "GOOGLE",
    TIKTOK: "TIKTOK",
    SNAPCHAT: "SNAPCHAT",
    LINKEDIN: "LINKEDIN",
    X: "X",
    PINTEREST: "PINTEREST",
  };
  return map[platform] ?? null;
}

export function parseOAuthState(state: string): { restaurantId: string; platform: MarketingPlatform } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (!parsed.restaurantId || !parsed.platform) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildOAuthState(restaurantId: string, platform: MarketingPlatform): string {
  return Buffer.from(JSON.stringify({ restaurantId, platform, ts: Date.now() })).toString("base64url");
}

export async function isOAuthConfigured(platform: MarketingPlatform): Promise<boolean> {
  const key = platformToIntegrationKey(platform);
  if (!key) return false;
  return isAdsIntegrationReady(key);
}

export async function getOAuthStartUrl(
  platform: MarketingPlatform,
  restaurantId: string
): Promise<string | null> {
  const key = platformToIntegrationKey(platform);
  if (!key) return null;
  const creds = await resolveAdsIntegration(key);
  if (!creds.clientId || !creds.clientSecret || !creds.isEnabled) return null;

  const def = ADS_INTEGRATION_DEFS[key];
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    scope: creds.scopes.join(key === "GOOGLE" || key === "X" ? " " : ","),
    state: buildOAuthState(restaurantId, platform),
    response_type: "code",
  });

  if (key === "GOOGLE") params.set("access_type", "offline");
  if (key === "GOOGLE") params.set("prompt", "consent");
  if (key === "X") params.set("code_challenge", "challenge");
  if (key === "X") params.set("code_challenge_method", "plain");

  return `${def.authUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(
  platform: MarketingPlatform,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const key = platformToIntegrationKey(platform);
  if (!key) throw new Error("منصة غير مدعومة");

  const creds = await resolveAdsIntegration(key);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error("خدمة الربط غير مفعّلة — تواصل مع مسؤول المنصة");
  }

  const def = ADS_INTEGRATION_DEFS[key];
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    redirect_uri: creds.redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(def.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens.error?.message || "فشل تسجيل الدخول");
  }

  if (key === "META") {
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        fb_exchange_token: tokens.access_token,
      })}`
    );
    const long = (await longRes.json()) as { access_token?: string; expires_in?: number };
    return {
      accessToken: long.access_token || tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: long.expires_in || tokens.expires_in,
    };
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

export async function discoverAllAdAccounts(
  platform: MarketingPlatform,
  accessToken: string
): Promise<DiscoveredAdAccount[]> {
  if (platform === "META" || platform === "FACEBOOK" || platform === "INSTAGRAM") {
    try {
      const res = await fetch(
        `${GRAPH}/me/adaccounts?fields=id,name,account_id,currency,timezone_name,business_name&limit=50&access_token=${accessToken}`
      );
      const data = (await res.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          account_id?: string;
          currency?: string;
          timezone_name?: string;
          business_name?: string;
        }>;
      };
      return (data.data || []).map((acct) => ({
        accountId: acct.account_id || acct.id,
        accountName: acct.name || acct.business_name || "Meta Ad Account",
        businessName: acct.business_name || acct.name || null,
        currency: acct.currency || null,
        timezone: acct.timezone_name || null,
      }));
    } catch {
      return [];
    }
  }

  const single = await discoverAdAccount(platform, accessToken);
  return single ? [single] : [];
}

export async function discoverAdAccount(
  platform: MarketingPlatform,
  accessToken: string
): Promise<DiscoveredAdAccount | null> {
  if (platform === "META" || platform === "FACEBOOK" || platform === "INSTAGRAM") {
    try {
      const res = await fetch(
        `${GRAPH}/me/adaccounts?fields=id,name,account_id,currency,timezone_name,business_name&limit=1&access_token=${accessToken}`
      );
      const data = (await res.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          account_id?: string;
          currency?: string;
          timezone_name?: string;
          business_name?: string;
        }>;
      };
      const acct = data.data?.[0];
      if (!acct) return null;
      return {
        accountId: acct.account_id || acct.id,
        accountName: acct.name || acct.business_name || "Meta Ad Account",
        businessName: acct.business_name || acct.name || null,
        currency: acct.currency || null,
        timezone: acct.timezone_name || null,
      };
    } catch {
      return null;
    }
  }

  return {
    accountId: "connected",
    accountName: `${platform} Account`,
    businessName: null,
    currency: "SAR",
    timezone: "Asia/Riyadh",
  };
}

export async function refreshAccessTokenIfNeeded(
  platform: MarketingPlatform,
  refreshTokenEnc: string | null
): Promise<{ accessToken: string; expiresIn?: number } | null> {
  if (!refreshTokenEnc || !canEncryptTokens()) return null;
  const key = platformToIntegrationKey(platform);
  if (!key) return null;

  const creds = await resolveAdsIntegration(key);
  if (!creds.clientId || !creds.clientSecret) return null;

  const refreshToken = decryptToken(refreshTokenEnc);
  const def = ADS_INTEGRATION_DEFS[key];

  const res = await fetch(def.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) return null;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export { encryptToken, getAdsOAuthRedirectUri };
