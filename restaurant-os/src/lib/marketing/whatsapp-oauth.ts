import { sanitizeAccessToken, graphGet, graphPost } from "@/lib/marketing/whatsapp-graph-api";
import { resolveMetaCredentials, getMetaOAuthRedirectUri, isMetaOAuthReady } from "@/lib/platform/meta-config";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { resolveMetaBusinessIds, resolveAssignedWabaIds } from "@/lib/marketing/whatsapp-platform-probe";
import crypto from "crypto";

export const WHATSAPP_OAUTH_SCOPES = [
  "business_management",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
].join(",");

export async function whatsAppOAuthConfigured(): Promise<boolean> {
  const [oauthReady, platformToken] = await Promise.all([
    isMetaOAuthReady(),
    resolveWhatsAppAccessToken(),
  ]);
  return oauthReady && Boolean(platformToken);
}

export function getWhatsAppOAuthRedirectUri(): string {
  return getMetaOAuthRedirectUri();
}

export function getEmbeddedSignupConfigId(): string | null {
  return process.env.META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || null;
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

export async function getWhatsAppOAuthStartUrl(restaurantId: string): Promise<string | null> {
  const { clientId } = await resolveMetaCredentials();
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getWhatsAppOAuthRedirectUri(),
    scope: WHATSAPP_OAUTH_SCOPES,
    state: buildWhatsAppOAuthState(restaurantId),
    response_type: "code",
  });
  return `https://www.facebook.com/${"v23.0"}/dialog/oauth?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string): Promise<{ accessToken: string; expiresIn?: number }> {
  const { clientId, clientSecret } = await resolveMetaCredentials();
  if (!clientId || !clientSecret) throw new Error("خدمة الربط مع Meta غير مفعّلة بعد");

  const tokenRes = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token`, {
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
    throw new Error(short.error?.message || "فشل تسجيل الدخول إلى Meta");
  }

  const longRes = await fetch(
    `https://graph.facebook.com/v23.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: short.access_token,
    })}`
  );
  const long = (await longRes.json()) as { access_token?: string; expires_in?: number };
  return {
    accessToken: sanitizeAccessToken(long.access_token || short.access_token)!,
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

async function listWabasForBusiness(businessId: string, accessToken: string) {
  const wabas: Array<{ id: string; name?: string }> = [];
  const seen = new Set<string>();
  const add = (items: Array<{ id: string; name?: string }> | undefined) => {
    for (const item of items || []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        wabas.push(item);
      }
    }
  };

  try {
    const owned = await graphGet<{ data?: Array<{ id: string; name?: string }> }>(
      `/${businessId}/owned_whatsapp_business_accounts`,
      accessToken,
      { fields: "id,name", limit: "25" }
    );
    add(owned.data);
  } catch {
    /* try client accounts */
  }
  try {
    const client = await graphGet<{ data?: Array<{ id: string; name?: string }> }>(
      `/${businessId}/client_whatsapp_business_accounts`,
      accessToken,
      { fields: "id,name", limit: "25" }
    );
    add(client.data);
  } catch {
    /* skip */
  }
  return wabas;
}

async function phonesFromWaba(
  wabaId: string,
  wabaName: string,
  businessId: string,
  businessName: string,
  accessToken: string
): Promise<DiscoveredPhone[]> {
  const nums = await graphGet<{
    data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }>;
  }>(`/${wabaId}/phone_numbers`, accessToken, {
    fields: "id,display_phone_number,verified_name",
    limit: "25",
  });
  return (nums.data || []).map((n) => ({
    id: n.id,
    displayPhone: n.display_phone_number || "",
    verifiedName: n.verified_name || wabaName || businessName,
    wabaId,
    wabaName,
    businessId,
    businessName,
  }));
}

export async function discoverWhatsAppAccounts(
  accessToken: string,
  opts?: { nameHint?: string; wabaIds?: string[] }
): Promise<DiscoveredAccounts> {
  const token = sanitizeAccessToken(accessToken);
  if (!token) return { phones: [] };

  const phones: DiscoveredPhone[] = [];
  const businessIds = await resolveMetaBusinessIds(token);
  const wabaHints = new Set((opts?.wabaIds || []).filter(Boolean));
  for (const wabaId of await resolveAssignedWabaIds(token)) {
    wabaHints.add(wabaId);
  }

  for (const biz of businessIds) {
    const wabas = await listWabasForBusiness(biz.id, token);
    for (const waba of wabas) {
      wabaHints.add(waba.id);
      try {
        phones.push(...(await phonesFromWaba(waba.id, waba.name || "", biz.id, biz.name, token)));
      } catch {
        /* skip waba */
      }
    }
  }

  for (const wabaId of wabaHints) {
    if (phones.some((p) => p.wabaId === wabaId)) continue;
    try {
      phones.push(
        ...(await phonesFromWaba(wabaId, "", businessIds[0]?.id || wabaId, businessIds[0]?.name || "WABA", token))
      );
    } catch {
      /* direct WABA probe failed */
    }
  }

  if (opts?.nameHint) {
    const hint = opts.nameHint.toLowerCase();
    const matched = phones.filter((p) =>
      [p.verifiedName, p.wabaName, p.businessName, p.displayPhone].some((s) =>
        s?.toLowerCase().includes(hint)
      )
    );
    if (matched.length) return { phones: matched };
  }

  return { phones };
}

/** Discover WABAs using platform System User token (production path). */
export async function discoverWhatsAppAccountsFromPlatform(
  nameHint?: string,
  wabaIds?: string[]
): Promise<DiscoveredAccounts> {
  const token = await resolveWhatsAppAccessToken();
  if (!token) throw new Error("WhatsApp Access Token is required");
  return discoverWhatsAppAccounts(token, { nameHint, wabaIds });
}

export function generateVerifyToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function subscribeWabaWebhook(wabaId: string, accessToken: string): Promise<boolean> {
  try {
    const data = await graphPost<{ success?: boolean }>(
      `/${wabaId}/subscribed_apps`,
      accessToken,
      {}
    );
    return data.success !== false;
  } catch {
    return false;
  }
}

export async function checkWabaSubscription(wabaId: string, accessToken: string): Promise<boolean> {
  try {
    const data = await graphGet<{ data?: unknown[] }>(`/${wabaId}/subscribed_apps`, accessToken);
    return (data.data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function fetchWabaPhoneNumbers(wabaId: string, accessToken: string) {
  return graphGet<{
    data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }>;
  }>(`/${wabaId}/phone_numbers`, accessToken, {
    fields: "id,display_phone_number,verified_name",
    limit: "25",
  });
}

export async function fetchWabaMessageTemplates(wabaId: string, accessToken: string) {
  return graphGet<{
    data?: Array<{
      name: string;
      language: string;
      status: string;
      category: string;
      last_updated_time?: string;
    }>;
  }>(`/${wabaId}/message_templates`, accessToken, { limit: "50" });
}

export { resolveMetaCredentials, sanitizeAccessToken };
