import prisma from "@/lib/prisma";
import { encryptToken, decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";
import { whatsAppWebhookUrl } from "@/lib/marketing/whatsapp-business";

const GRAPH = "https://graph.facebook.com/v21.0";
const CONFIG_ID = "default";

export type MetaCredentials = {
  clientId: string | null;
  clientSecret: string | null;
  webhookVerifyToken: string | null;
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

export function getMetaOAuthRedirectUri(): string {
  return `${resolveAppBaseUrl()}/api/marketing/whatsapp/oauth/callback`;
}

export async function resolveMetaCredentials(): Promise<MetaCredentials> {
  const row = await prisma.platformMetaConfig.findUnique({ where: { id: CONFIG_ID } });

  let clientId = row?.clientId || envClientId();
  let clientSecret: string | null = null;
  let webhookVerifyToken: string | null = null;
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

  if (source === "none" && (clientId || clientSecret)) {
    source = "environment";
  }

  return {
    clientId,
    clientSecret,
    webhookVerifyToken,
    source,
    facebookAppName: row?.facebookAppName || null,
  };
}

export async function isMetaOAuthReady(): Promise<boolean> {
  const creds = await resolveMetaCredentials();
  return Boolean(creds.clientId && creds.clientSecret);
}

export async function getPlatformMetaAdminView() {
  const creds = await resolveMetaCredentials();
  const alerts = await prisma.platformAdminAlert.findMany({
    where: { kind: "META_OAUTH_SETUP", isRead: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    facebookAppName: creds.facebookAppName,
    clientId: creds.clientId,
    hasClientSecret: Boolean(creds.clientSecret),
    redirectUri: getMetaOAuthRedirectUri(),
    webhookUrl: whatsAppWebhookUrl(),
    hasWebhookVerifyToken: Boolean(creds.webhookVerifyToken),
    configSource: creds.source,
    oauthReady: Boolean(creds.clientId && creds.clientSecret),
    encryptionReady: canEncryptTokens(),
    pendingAlerts: alerts,
    health: await runPlatformMetaHealthCheck(),
  };
}

export async function savePlatformMetaConfig(input: {
  facebookAppName?: string;
  clientId?: string;
  clientSecret?: string;
  webhookVerifyToken?: string;
  userId?: string;
}) {
  if (!canEncryptTokens()) {
    throw new Error("تشفير المنصة غير مفعّل — تواصل مع الدعم الفني");
  }

  const existing = await prisma.platformMetaConfig.findUnique({ where: { id: CONFIG_ID } });
  const data: {
    facebookAppName?: string;
    clientId?: string;
    clientSecretEnc?: string;
    webhookVerifyTokenEnc?: string;
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

  if (!existing && !data.clientId && !envClientId()) {
    throw new Error("Client ID مطلوب");
  }

  return prisma.platformMetaConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      facebookAppName: data.facebookAppName ?? null,
      clientId: data.clientId ?? envClientId(),
      clientSecretEnc: data.clientSecretEnc ?? null,
      webhookVerifyTokenEnc: data.webhookVerifyTokenEnc ?? null,
      updatedByUserId: input.userId,
    },
    update: data,
  });
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

  const cloudOk = canEncryptTokens();
  items.push({
    id: "cloud_api",
    label: "Cloud API Ready",
    ok: cloudOk && oauthOk,
    detail: cloudOk
      ? oauthOk
        ? "التشفير وOAuth جاهزان"
        : "OAuth غير مكتمل"
      : "تشفير الرموز غير مفعّل",
  });

  let templateOk = false;
  let templateDetail = "تُفحص بعد ربط مطعم";
  if (oauthOk && creds.clientId && creds.clientSecret) {
    try {
      const appToken = `${creds.clientId}|${creds.clientSecret}`;
      const res = await fetch(`${GRAPH}/${creds.clientId}?fields=id,name`, {
        headers: { Authorization: `Bearer ${appToken}` },
      });
      templateOk = res.ok;
      templateDetail = templateOk ? "Graph API يستجيب" : "فشل الاتصال بـ Graph API";
    } catch {
      templateDetail = "تعذّر الاتصال بـ Graph API";
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

export async function testPlatformMetaConnection(): Promise<{ ok: boolean; message: string; appName?: string }> {
  const creds = await resolveMetaCredentials();
  if (!creds.clientId || !creds.clientSecret) {
    return { ok: false, message: "بيانات تطبيق Meta غير مكتملة" };
  }

  try {
    const appToken = `${creds.clientId}|${creds.clientSecret}`;
    const res = await fetch(`${GRAPH}/${creds.clientId}?fields=id,name`, {
      headers: { Authorization: `Bearer ${appToken}` },
    });
    const data = (await res.json()) as { id?: string; name?: string; error?: { message?: string } };
    if (!res.ok) {
      return { ok: false, message: data.error?.message || "فشل اختبار الاتصال" };
    }
    return { ok: true, message: "تم التحقق من تطبيق Meta بنجاح", appName: data.name };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "خطأ في الاتصال" };
  }
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
