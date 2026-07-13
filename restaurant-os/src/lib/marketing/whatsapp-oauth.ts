import crypto from "crypto";
import { encryptToken, decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";

const GRAPH = "https://graph.facebook.com/v21.0";

export const WHATSAPP_OAUTH_SCOPES = [
  "business_management",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
].join(",");

export function whatsAppOAuthConfigured(): boolean {
  return Boolean(getClientId() && getClientSecret());
}

function getClientId() {
  return process.env.WHATSAPP_META_CLIENT_ID || process.env.META_ADS_CLIENT_ID;
}

function getClientSecret() {
  return process.env.WHATSAPP_META_CLIENT_SECRET || process.env.META_ADS_CLIENT_SECRET;
}

export function getWhatsAppOAuthRedirectUri(): string {
  return `${resolveAppBaseUrl()}/api/marketing/whatsapp/oauth/callback`;
}

export function buildWhatsAppOAuthState(restaurantId: string, returnStep = 2): string {
  return Buffer.from(JSON.stringify({ restaurantId, returnStep, ts: Date.now() })).toString("base64url");
}

export function parseWhatsAppOAuthState(state: string): { restaurantId: string; returnStep: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (!parsed.restaurantId) return null;
    return { restaurantId: parsed.restaurantId, returnStep: parsed.returnStep ?? 2 };
  } catch {
    return null;
  }
}

export function getWhatsAppOAuthStartUrl(restaurantId: string): string | null {
  const clientId = getClientId();
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getWhatsAppOAuthRedirectUri(),
    scope: WHATSAPP_OAUTH_SCOPES,
    state: buildWhatsAppOAuthState(restaurantId),
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string): Promise<{ accessToken: string; expiresIn?: number }> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) throw new Error("Meta OAuth credentials not configured");

  const tokenRes = await fetch(`${GRAPH}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getWhatsAppOAuthRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const short = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } };
  if (!tokenRes.ok || !short.access_token) {
    throw new Error(short.error?.message || "Token exchange failed");
  }

  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: short.access_token,
    })}`
  );
  const long = (await longRes.json()) as { access_token?: string; expires_in?: number };
  return {
    accessToken: long.access_token || short.access_token,
    expiresIn: long.expires_in,
  };
}

export type DiscoveredPhone = {
  id: string;
  displayPhone: string;
  verifiedName: string;
  wabaId: string;
  wabaName: string;
  businessId: string;
  businessName: string;
};

export type DiscoveredAccounts = {
  phones: DiscoveredPhone[];
};

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: { message?: string } }).error?.message || `Graph ${res.status}`);
  }
  return data as T;
}

export async function discoverWhatsAppAccounts(accessToken: string): Promise<DiscoveredAccounts> {
  const phones: DiscoveredPhone[] = [];

  const businesses = await graphGet<{ data?: Array<{ id: string; name: string }> }>(
    `/me/businesses?fields=id,name&limit=25`,
    accessToken
  );

  for (const biz of businesses.data || []) {
    let wabas: Array<{ id: string; name?: string }> = [];
    try {
      const owned = await graphGet<{ data?: Array<{ id: string; name?: string }> }>(
        `/${biz.id}/owned_whatsapp_business_accounts?fields=id,name&limit=25`,
        accessToken
      );
      wabas = owned.data || [];
    } catch {
      try {
        const client = await graphGet<{ data?: Array<{ id: string; name?: string }> }>(
          `/${biz.id}/client_whatsapp_business_accounts?fields=id,name&limit=25`,
          accessToken
        );
        wabas = client.data || [];
      } catch {
        /* skip business */
      }
    }

    for (const waba of wabas) {
      try {
        const nums = await graphGet<{
          data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }>;
        }>(`/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name&limit=25`, accessToken);
        for (const n of nums.data || []) {
          phones.push({
            id: n.id,
            displayPhone: n.display_phone_number || "",
            verifiedName: n.verified_name || waba.name || biz.name,
            wabaId: waba.id,
            wabaName: waba.name || "",
            businessId: biz.id,
            businessName: biz.name,
          });
        }
      } catch {
        /* skip waba */
      }
    }
  }

  return { phones };
}

export function generateVerifyToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function subscribeWabaWebhook(wabaId: string, accessToken: string): Promise<boolean> {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && (data as { success?: boolean }).success !== false;
}

export async function checkWabaSubscription(wabaId: string, accessToken: string): Promise<boolean> {
  try {
    const data = await graphGet<{ data?: unknown[] }>(`/${wabaId}/subscribed_apps`, accessToken);
    return (data.data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export { getClientId, getClientSecret, GRAPH, encryptToken, decryptToken, canEncryptTokens };
