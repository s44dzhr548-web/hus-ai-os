import prisma from "@/lib/prisma";
import { encryptToken, decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";
import { whatsAppWebhookUrl } from "@/lib/marketing/whatsapp-business";
import { fetchWithTimeout, isAbortError } from "@/lib/fetch-with-timeout";
import { testWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { sanitizeAccessToken } from "@/lib/marketing/whatsapp-graph-api";

const CONFIG_ID = "default";

export type MetaCredentials = {
  clientId: string | null;
  clientSecret: string | null;
  webhookVerifyToken: string | null;
  whatsappAccessToken: string | null;
  metaBusinessId: string | null;
  source: "database" | "environment" | "none";
  facebookAppName: string | null;
};

export type PlatformMetaHealthItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

function envClientId(): string | null {
  return process.env.WHATSAPP_META_CLIENT_ID || process.env.META_ADS_CLIENT_ID || null;
}

function envClientSecret(): string | null {
  return process.env.WHATSAPP_META_CLIENT_SECRET || process.env.META_ADS_CLIENT_SECRET || null;
}

function envWebhookVerifyToken(): string | null {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || null;
}

function envWhatsAppAccessToken(): string | null {
  return sanitizeAccessToken(process.env.WHATSAPP_ACCESS_TOKEN);
}

export function getMetaOAuthRedirectUri(): string {
  return `${resolveAppBaseUrl()}/api/marketing/whatsapp/oauth/callback`;
}

export async function resolveMetaCredentials(): Promise<MetaCredentials> {
  const row = await prisma.platformMetaConfig.findUnique({ where: { id: CONFIG_ID } });

  let clientId = row?.clientId || envClientId();
  let clientSecret: string | null = null;
  let webhookVerifyToken: string | null = null;
  let whatsappAccessToken: string | null = null;
  let source: MetaCredentials["source"] = "none";

  if (row?.clientSecretEnc && canEncryptTokens()) {
    try {
      clientSecret = decryptToken(row.clientSecretEnc);
      source = "database";
    } catch {
      clientSecret = null;
    }
  }
  if (!clientSecret) {
    clientSecret = envClientSecret();
    if (clientSecret && source === "none") source = "environment";
  }
  if (row?.clientId && source === "none") source = "database";
  if (clientId && !clientSecret && envClientSecret()) {
    clientSecret = envClientSecret();
    source = source === "database" ? "database" : "environment";
  }

  if (row?.webhookVerifyTokenEnc && canEncryptTokens()) {
    try {
      webhookVerifyToken = decryptToken(row.webhookVerifyTokenEnc);
    } catch {
      webhookVerifyToken = null;
    }
  }
  if (!webhookVerifyToken) {
    webhookVerifyToken = envWebhookVerifyToken();
  }

  if (row?.whatsappAccessTokenEnc && canEncryptTokens()) {
    try {
      whatsappAccessToken = sanitizeAccessToken(decryptToken(row.whatsappAccessTokenEnc));
      if (source === "none") source = "database";
    } catch {
      whatsappAccessToken = null;
    }
  }
  if (!whatsappAccessToken) {
    whatsappAccessToken = envWhatsAppAccessToken();
    if (whatsappAccessToken && source === "none") source = "environment";
  }

  if (source === "none" && (clientId || clientSecret || whatsappAccessToken)) {
    source = "environment";
  }

  return {
    clientId,
    clientSecret,
    webhookVerifyToken,
    whatsappAccessToken,
    metaBusinessId: row?.metaBusinessId || process.env.META_BUSINESS_ID?.trim() || null,
    source,
    facebookAppName: row?.facebookAppName || null,
  };
}

export async function isMetaOAuthReady(): Promise<boolean> {
  const creds = await resolveMetaCredentials();
  return Boolean(creds.clientId && creds.clientSecret);
}

export async function getPlatformMetaAdminView(opts?: { skipHealth?: boolean }) {
  const creds = await resolveMetaCredentials();
  const alerts = await prisma.platformAdminAlert.findMany({
    where: { kind: "META_OAUTH_SETUP", isRead: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    facebookAppName: creds.facebookAppName,
    clientId: creds.clientId,
    metaBusinessId: creds.metaBusinessId,
    hasClientSecret: Boolean(creds.clientSecret),
    hasWhatsAppAccessToken: Boolean(creds.whatsappAccessToken),
    redirectUri: getMetaOAuthRedirectUri(),
    webhookUrl: whatsAppWebhookUrl(),
    hasWebhookVerifyToken: Boolean(creds.webhookVerifyToken),
    configSource: creds.source,
    oauthReady: Boolean(creds.clientId && creds.clientSecret),
    encryptionReady: canEncryptTokens(),
    pendingAlerts: alerts,
    health: opts?.skipHealth ? [] : await runPlatformMetaHealthCheck(),
  };
}

export async function savePlatformMetaConfig(input: {
  facebookAppName?: string;
  clientId?: string;
  clientSecret?: string;
  webhookVerifyToken?: string;
  whatsappAccessToken?: string;
  metaBusinessId?: string;
  userId?: string;
}) {
  if (!canEncryptTokens()) {
    throw new Error(
      "MARKETING_TOKEN_SECRET غير مضبوط على الخادم (٣٢ حرفاً على الأقل) — لا يمكن حفظ الرموز المشفّرة"
    );
  }

  const existing = await prisma.platformMetaConfig.findUnique({ where: { id: CONFIG_ID } });
  const data: {
    facebookAppName?: string;
    clientId?: string;
    clientSecretEnc?: string;
    webhookVerifyTokenEnc?: string;
    whatsappAccessTokenEnc?: string;
    metaBusinessId?: string | null;
    updatedByUserId?: string;
  } = { updatedByUserId: input.userId };

  if (input.facebookAppName !== undefined) {
    data.facebookAppName = input.facebookAppName.trim() || undefined;
  }
  if (input.clientId !== undefined) {
    data.clientId = input.clientId.trim() || undefined;
  }
  if (input.clientSecret?.trim()) {
    data.clientSecretEnc = encryptToken(input.clientSecret.trim());
  }
  if (input.webhookVerifyToken?.trim()) {
    data.webhookVerifyTokenEnc = encryptToken(input.webhookVerifyToken.trim());
  }
  if (input.whatsappAccessToken?.trim()) {
    data.whatsappAccessTokenEnc = encryptToken(sanitizeAccessToken(input.whatsappAccessToken.trim())!);
  }
  if (input.metaBusinessId !== undefined) {
    data.metaBusinessId = input.metaBusinessId.trim() || null;
  }

  if (!existing && !data.clientId && !envClientId()) {
    throw new Error("Client ID مطلوب");
  }

  await prisma.platformMetaConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      facebookAppName: data.facebookAppName ?? null,
      clientId: data.clientId ?? envClientId(),
      clientSecretEnc: data.clientSecretEnc ?? null,
      webhookVerifyTokenEnc: data.webhookVerifyTokenEnc ?? null,
      whatsappAccessTokenEnc: data.whatsappAccessTokenEnc ?? null,
      metaBusinessId: data.metaBusinessId ?? null,
      updatedByUserId: input.userId,
    },
    update: data,
  });

  let connectionTest: { ok: boolean; message: string; name?: string; id?: string } | undefined;
  if (input.whatsappAccessToken?.trim()) {
    connectionTest = await testPlatformMetaConnection(input.whatsappAccessToken.trim());
  } else {
    const creds = await resolveMetaCredentials();
    if (creds.whatsappAccessToken) {
      connectionTest = await testPlatformMetaConnection(creds.whatsappAccessToken);
    }
  }

  return { connectionTest };
}

export async function runPlatformMetaHealthCheck(): Promise<PlatformMetaHealthItem[]> {
  const creds = await resolveMetaCredentials();
  const items: PlatformMetaHealthItem[] = [];

  const oauthOk = Boolean(creds.clientId && creds.clientSecret);
  items.push({
    id: "oauth",
    label: "OAuth Ready",
    ok: oauthOk,
    detail: oauthOk ? "بيانات تطبيق Meta متوفرة" : "بانتظار إعداد Client ID و Secret",
  });

  const webhookOk = Boolean(creds.webhookVerifyToken) && Boolean(whatsAppWebhookUrl());
  items.push({
    id: "webhook",
    label: "Webhook Ready",
    ok: webhookOk,
    detail: webhookOk ? "رمز التحقق وعنوان Webhook جاهزان" : "بانتظار رمز التحقق",
  });

  const whatsappTokenOk = Boolean(creds.whatsappAccessToken);
  items.push({
    id: "cloud_api",
    label: "Cloud API Ready",
    ok: whatsappTokenOk && canEncryptTokens(),
    detail: whatsappTokenOk
      ? "WhatsApp Access Token configured"
      : "WhatsApp Access Token is required",
  });

  let templateOk = false;
  let templateDetail = "WhatsApp Access Token is required";
  if (creds.whatsappAccessToken) {
    try {
      const test = await testWhatsAppAccessToken(creds.whatsappAccessToken);
      templateOk = test.ok;
      templateDetail = test.ok
        ? test.name
          ? `Connected as ${test.name}`
          : "WhatsApp connection successful"
        : test.message;
    } catch (e) {
      templateDetail = isAbortError(e)
        ? "انتهت مهلة الاتصال بـ Graph API"
        : "تعذّر الاتصال بـ Graph API";
    }
  }

  items.push({
    id: "template_sync",
    label: "Template Sync",
    ok: templateOk,
    detail: templateDetail,
  });

  items.push({
    id: "business_verification",
    label: "Business Verification",
    ok: oauthOk,
    detail: oauthOk ? "يُتحقق عند ربط حساب Meta Business" : "بانتظار OAuth",
  });

  items.push({
    id: "phone_connected",
    label: "Phone Connected",
    ok: false,
    detail: "يُفعّل بعد اختيار المالك لرقم واتساب",
  });

  return items;
}

export async function testPlatformMetaConnection(
  whatsappAccessToken?: string
): Promise<{ ok: boolean; message: string; name?: string; id?: string; appName?: string }> {
  let token = whatsappAccessToken?.trim() || null;

  if (!token) {
    const creds = await resolveMetaCredentials();
    token = creds.whatsappAccessToken;
  }

  if (!token) {
    return { ok: false, message: "WhatsApp Access Token is required" };
  }

  const result = await testWhatsAppAccessToken(token);
  return {
    ...result,
    appName: result.name,
  };
}

export async function notifyPlatformAdminMetaSetup(restaurantId: string, restaurantName: string) {
  const recent = await prisma.platformAdminAlert.findFirst({
    where: {
      kind: "META_OAUTH_SETUP",
      restaurantId,
      isRead: false,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent) return recent;

  return prisma.platformAdminAlert.create({
    data: {
      kind: "META_OAUTH_SETUP",
      restaurantId,
      title: "طلب تفعيل واتساب Meta",
      message: `المطعم «${restaurantName}» يحتاج تفعيل خدمة الربط مع Meta.`,
    },
  });
}
