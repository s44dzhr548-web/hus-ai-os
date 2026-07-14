import prisma from "@/lib/prisma";
import { encryptToken, decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";

export const ADS_INTEGRATION_KEYS = [
  "META",
  "GOOGLE",
  "TIKTOK",
  "SNAPCHAT",
  "LINKEDIN",
  "X",
  "PINTEREST",
] as const;

export type AdsIntegrationKey = (typeof ADS_INTEGRATION_KEYS)[number];

export type AdsIntegrationDefinition = {
  key: AdsIntegrationKey;
  label: string;
  labelAr: string;
  brandColor: string;
  envClientId: string;
  envClientSecret: string;
  authUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
};

export const ADS_INTEGRATION_DEFS: Record<AdsIntegrationKey, AdsIntegrationDefinition> = {
  META: {
    key: "META",
    label: "Meta Developer App",
    labelAr: "Meta Ads",
    brandColor: "#0081FB",
    envClientId: "META_ADS_CLIENT_ID",
    envClientSecret: "META_ADS_CLIENT_SECRET",
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    defaultScopes: ["ads_management", "ads_read", "business_management"],
  },
  GOOGLE: {
    key: "GOOGLE",
    label: "Google Cloud OAuth",
    labelAr: "Google Ads",
    brandColor: "#4285F4",
    envClientId: "GOOGLE_ADS_CLIENT_ID",
    envClientSecret: "GOOGLE_ADS_CLIENT_SECRET",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    defaultScopes: ["https://www.googleapis.com/auth/adwords"],
  },
  TIKTOK: {
    key: "TIKTOK",
    label: "TikTok Developer",
    labelAr: "TikTok Ads",
    brandColor: "#000000",
    envClientId: "TIKTOK_ADS_CLIENT_ID",
    envClientSecret: "TIKTOK_ADS_CLIENT_SECRET",
    authUrl: "https://business-api.tiktok.com/portal/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    defaultScopes: ["ad_management", "reporting"],
  },
  SNAPCHAT: {
    key: "SNAPCHAT",
    label: "Snapchat Developer",
    labelAr: "Snap Ads",
    brandColor: "#FFFC00",
    envClientId: "SNAPCHAT_ADS_CLIENT_ID",
    envClientSecret: "SNAPCHAT_ADS_CLIENT_SECRET",
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    defaultScopes: ["snapchat-marketing-api"],
  },
  LINKEDIN: {
    key: "LINKEDIN",
    label: "LinkedIn Developer",
    labelAr: "LinkedIn Ads",
    brandColor: "#0A66C2",
    envClientId: "LINKEDIN_ADS_CLIENT_ID",
    envClientSecret: "LINKEDIN_ADS_CLIENT_SECRET",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    defaultScopes: ["r_ads", "r_ads_reporting", "rw_ads"],
  },
  X: {
    key: "X",
    label: "X Developer",
    labelAr: "X Ads",
    brandColor: "#000000",
    envClientId: "X_ADS_CLIENT_ID",
    envClientSecret: "X_ADS_CLIENT_SECRET",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    defaultScopes: ["tweet.read", "users.read", "offline.access"],
  },
  PINTEREST: {
    key: "PINTEREST",
    label: "Pinterest Developer",
    labelAr: "Pinterest Ads",
    brandColor: "#E60023",
    envClientId: "PINTEREST_ADS_CLIENT_ID",
    envClientSecret: "PINTEREST_ADS_CLIENT_SECRET",
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    defaultScopes: ["ads:read", "ads:write"],
  },
};

export type AdsIntegrationCredentials = {
  platformKey: AdsIntegrationKey;
  clientId: string | null;
  clientSecret: string | null;
  webhookVerifyToken: string | null;
  redirectUri: string;
  webhookUrl: string | null;
  scopes: string[];
  source: "database" | "environment" | "meta_config" | "none";
  isEnabled: boolean;
};

function envOrNull(key: string): string | null {
  return process.env[key]?.trim() || null;
}

export function getAdsOAuthRedirectUri(platformKey: AdsIntegrationKey): string {
  const base = resolveAppBaseUrl();
  return `${base}/api/marketing/connections/${platformKey.toLowerCase()}/callback`;
}

export function getAdsWebhookUrl(platformKey: AdsIntegrationKey): string {
  const base = resolveAppBaseUrl();
  return `${base}/api/webhooks/ads/${platformKey.toLowerCase()}`;
}

export async function resolveAdsIntegration(platformKey: AdsIntegrationKey): Promise<AdsIntegrationCredentials> {
  const def = ADS_INTEGRATION_DEFS[platformKey];
  const row = await prisma.platformAdsIntegration.findUnique({ where: { platformKey } });

  let clientId = row?.clientId || envOrNull(def.envClientId);
  let clientSecret: string | null = null;
  let webhookVerifyToken: string | null = null;
  let source: AdsIntegrationCredentials["source"] = "none";

  if (row?.clientSecretEnc && canEncryptTokens()) {
    try {
      clientSecret = decryptToken(row.clientSecretEnc);
      source = "database";
    } catch {
      clientSecret = null;
    }
  }
  if (!clientSecret) {
    clientSecret = envOrNull(def.envClientSecret);
    if (clientSecret) source = source === "database" ? "database" : "environment";
  }

  if (platformKey === "META" && (!clientId || !clientSecret)) {
    const meta = await resolveMetaCredentials();
    if (!clientId) clientId = meta.clientId;
    if (!clientSecret) clientSecret = meta.clientSecret;
    if (!webhookVerifyToken) webhookVerifyToken = meta.webhookVerifyToken;
    if (meta.clientId && meta.clientSecret) source = meta.source === "database" ? "meta_config" : "environment";
  }

  if (row?.webhookVerifyTokenEnc && canEncryptTokens()) {
    try {
      webhookVerifyToken = decryptToken(row.webhookVerifyTokenEnc);
    } catch {
      /* keep fallback */
    }
  }

  const scopes = row?.oauthScopes?.length ? row.oauthScopes : def.defaultScopes;

  return {
    platformKey,
    clientId,
    clientSecret,
    webhookVerifyToken,
    redirectUri: row?.redirectUriOverride || getAdsOAuthRedirectUri(platformKey),
    webhookUrl: row?.webhookUrlOverride || getAdsWebhookUrl(platformKey),
    scopes,
    source,
    isEnabled: row?.isEnabled ?? true,
  };
}

export async function isAdsIntegrationReady(platformKey: AdsIntegrationKey): Promise<boolean> {
  const creds = await resolveAdsIntegration(platformKey);
  return Boolean(creds.isEnabled && creds.clientId && creds.clientSecret);
}

export async function getAdsIntegrationsAdminView() {
  const items = await Promise.all(
    ADS_INTEGRATION_KEYS.map(async (key) => {
      const creds = await resolveAdsIntegration(key);
      const def = ADS_INTEGRATION_DEFS[key];
      return {
        key,
        label: def.label,
        labelAr: def.labelAr,
        brandColor: def.brandColor,
        displayName: def.label,
        clientId: creds.clientId,
        hasClientSecret: Boolean(creds.clientSecret),
        redirectUri: creds.redirectUri,
        webhookUrl: creds.webhookUrl,
        hasWebhookVerifyToken: Boolean(creds.webhookVerifyToken),
        scopes: creds.scopes,
        source: creds.source,
        isEnabled: creds.isEnabled,
        oauthReady: Boolean(creds.clientId && creds.clientSecret),
      };
    })
  );

  const alerts = await prisma.platformAdminAlert.findMany({
    where: { kind: "ADS_INTEGRATION_SETUP", isRead: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return { integrations: items, pendingAlerts: alerts };
}

export async function saveAdsIntegration(
  platformKey: AdsIntegrationKey,
  input: {
    displayName?: string;
    clientId?: string;
    clientSecret?: string;
    webhookVerifyToken?: string;
    redirectUriOverride?: string;
    webhookUrlOverride?: string;
    oauthScopes?: string[];
    isEnabled?: boolean;
    userId?: string;
  }
) {
  if (!canEncryptTokens()) {
    throw new Error("تشفير المنصة غير مفعّل");
  }

  const def = ADS_INTEGRATION_DEFS[platformKey];
  const data: Record<string, unknown> = {
    updatedByUserId: input.userId,
    displayName: input.displayName?.trim() || def.label,
  };

  if (input.clientId !== undefined) data.clientId = input.clientId.trim() || null;
  if (input.clientSecret?.trim()) data.clientSecretEnc = encryptToken(input.clientSecret.trim());
  if (input.webhookVerifyToken?.trim()) data.webhookVerifyTokenEnc = encryptToken(input.webhookVerifyToken.trim());
  if (input.redirectUriOverride !== undefined) data.redirectUriOverride = input.redirectUriOverride.trim() || null;
  if (input.webhookUrlOverride !== undefined) data.webhookUrlOverride = input.webhookUrlOverride.trim() || null;
  if (input.oauthScopes) data.oauthScopes = input.oauthScopes;
  if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;

  return prisma.platformAdsIntegration.upsert({
    where: { platformKey },
    create: {
      platformKey,
      displayName: def.label,
      clientId: input.clientId?.trim() || envOrNull(def.envClientId),
      ...(data as object),
    },
    update: data as object,
  });
}

export async function testAdsIntegration(platformKey: AdsIntegrationKey): Promise<{ ok: boolean; message: string }> {
  const creds = await resolveAdsIntegration(platformKey);
  if (!creds.clientId || !creds.clientSecret) {
    return { ok: false, message: "بيانات الاعتماد غير مكتملة" };
  }

  if (platformKey === "META") {
    try {
      const appToken = `${creds.clientId}|${creds.clientSecret}`;
      const res = await fetch(`https://graph.facebook.com/v21.0/${creds.clientId}?fields=id,name`, {
        headers: { Authorization: `Bearer ${appToken}` },
      });
      const data = (await res.json()) as { name?: string; error?: { message?: string } };
      if (!res.ok) return { ok: false, message: data.error?.message || "فشل الاتصال" };
      return { ok: true, message: `Meta App: ${data.name || creds.clientId}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "خطأ في الاتصال" };
    }
  }

  return { ok: true, message: "تم التحقق من بيانات الاعتماد محلياً" };
}

export async function notifyPlatformAdminAdsSetup(restaurantId: string, restaurantName: string, platform: string) {
  const recent = await prisma.platformAdminAlert.findFirst({
    where: {
      kind: "ADS_INTEGRATION_SETUP",
      restaurantId,
      isRead: false,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent) return recent;

  return prisma.platformAdminAlert.create({
    data: {
      kind: "ADS_INTEGRATION_SETUP",
      restaurantId,
      title: `طلب تفعيل ${platform}`,
      message: `المطعم «${restaurantName}» يحتاج تفعيل منصة ${platform}.`,
    },
  });
}
