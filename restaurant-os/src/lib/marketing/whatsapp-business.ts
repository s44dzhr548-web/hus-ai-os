import type { WhatsAppDeliveryStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";
import { graphGet } from "@/lib/marketing/whatsapp-graph-api";
import {
  getOrCreateAutomation,
  automationFromRow,
  sendTestWhatsAppMessage,
  processWhatsAppQueue,
} from "@/lib/after-visit-whatsapp/service";
import { DEFAULT_AUTOMATION, DEFAULT_MESSAGE_BODY, DELAY_OPTIONS } from "@/lib/after-visit-whatsapp/types";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";
import {
  fetchWabaPhoneNumbers,
  fetchWabaMessageTemplates,
  checkWabaSubscription,
} from "@/lib/marketing/whatsapp-oauth";
import { refreshRestaurantWhatsAppConnection } from "@/lib/marketing/whatsapp-connection-service";

export type WhatsAppTemplateRow = {
  name: string;
  language: string;
  status: string;
  category: string;
  lastUpdated: string | null;
};

export type WhatsAppHealthCheck = {
  id: string;
  labelAr: string;
  ok: boolean;
  detail: string;
};

const SKIPPED_STATUSES: WhatsAppDeliveryStatus[] = [
  "SKIPPED_NO_CONSENT",
  "SKIPPED_NO_PHONE",
  "SKIPPED_NO_CONNECTION",
  "SKIPPED_DISABLED",
  "SKIPPED_DUPLICATE",
];

export function whatsAppWebhookUrl(): string {
  return `${resolveAppBaseUrl()}/api/webhooks/whatsapp`;
}

export async function fetchWhatsAppHubData(restaurantId: string) {
  void processWhatsAppQueue(20).catch(console.error);

  const [automation, deliveries, branches, restaurant, statusCounts, profile, notifications, platformToken, creds] =
    await Promise.all([
      getOrCreateAutomation(restaurantId),
      prisma.whatsAppMessageDelivery.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          visit: { select: { customerName: true, tableDisplayNumber: true } },
        },
      }),
      prisma.branch.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, name: true, nameAr: true },
      }),
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { slug: true, name: true, nameAr: true },
      }),
      prisma.whatsAppMessageDelivery.groupBy({
        by: ["status"],
        where: { restaurantId },
        _count: { status: true },
      }),
      prisma.whatsAppBusinessProfile.findUnique({ where: { restaurantId } }),
      prisma.whatsAppOwnerNotification.findMany({
        where: { restaurantId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      resolveWhatsAppAccessToken(),
      resolveMetaCredentials(),
    ]);

  let connection = await prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } });

  if (connection?.wabaId && connection.phoneNumberId && platformToken) {
    await refreshRestaurantWhatsAppConnection(restaurantId).catch(() => null);
    connection = await prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } });
  }

  const countMap = Object.fromEntries(
    statusCounts.map((r) => [r.status, r._count.status])
  ) as Record<string, number>;

  const stats = {
    queued: countMap.QUEUED ?? 0,
    sent: countMap.SENT ?? 0,
    delivered: countMap.DELIVERED ?? 0,
    read: countMap.READ ?? 0,
    failed: countMap.FAILED ?? 0,
    skipped: SKIPPED_STATUSES.reduce((n, s) => n + (countMap[s] ?? 0), 0),
    optedOut: countMap.OPTED_OUT ?? 0,
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = deliveries.filter(
    (d) => d.sentAt && new Date(d.sentAt) >= thirtyDaysAgo
  );

  const messagesPerDay: Record<string, number> = {};
  for (const d of recent) {
    const key = new Date(d.sentAt!).toISOString().slice(0, 10);
    messagesPerDay[key] = (messagesPerDay[key] ?? 0) + 1;
  }

  const sentTotal = stats.sent + stats.delivered + stats.read;
  const deliveredTotal = stats.delivered + stats.read;
  const rates = {
    deliveryRate: sentTotal ? Math.round((deliveredTotal / sentTotal) * 100) : 0,
    readRate: deliveredTotal ? Math.round((stats.read / deliveredTotal) * 100) : 0,
    failureRate: sentTotal
      ? Math.round((stats.failed / (sentTotal + stats.failed)) * 100)
      : 0,
  };

  const baseUrl = resolveAppBaseUrl();
  const reviewLinkExample =
    automation.reviewLinkBase ||
    (restaurant ? `${baseUrl}/r/${restaurant.slug}/rate` : baseUrl);

  let templates: WhatsAppTemplateRow[] = [];
  if (connection?.wabaId && platformToken) {
    try {
      templates = await syncTemplatesFromMeta(restaurantId);
    } catch {
      if (connection.templateName) {
        templates = [
          {
            name: connection.templateName,
            language: connection.templateLanguage,
            status: "CONFIGURED",
            category: "UTILITY",
            lastUpdated: connection.updatedAt.toISOString(),
          },
        ];
      }
    }
  } else if (connection?.templateName) {
    templates = [
      {
        name: connection.templateName,
        language: connection.templateLanguage,
        status: "CONFIGURED",
        category: "UTILITY",
        lastUpdated: connection.updatedAt.toISOString(),
      },
    ];
  }

  const today = new Date().toISOString().slice(0, 10);
  const messagesToday = deliveries.filter(
    (d) => d.sentAt && d.sentAt.toISOString().slice(0, 10) === today
  ).length;

  const probe = await probeRestaurantWhatsAppHealth(restaurantId, {
    connection,
    platformToken,
    creds,
    templateCount: templates.length,
  });
  await persistHealthProfile(restaurantId, probe.ok, probe.issues);

  const health = probe.health;
  const graphConnected = probe.graphOk;

  return {
    automation: automationFromRow(automation),
    connection: connection
      ? {
          id: connection.id,
          metaBusinessId: connection.metaBusinessId,
          wabaId: connection.wabaId,
          phoneNumberId: connection.phoneNumberId,
          businessPhone: connection.businessPhone,
          displayPhoneNumber: connection.businessPhone,
          templateName: connection.templateName,
          templateLanguage: connection.templateLanguage,
          isActive: connection.isActive,
          connectedAt: connection.connectedAt,
          connectionStatus: connection.connectionStatus,
          hasPlatformToken: Boolean(platformToken),
          connected: Boolean(
            connection.isActive &&
              connection.phoneNumberId &&
              connection.connectionStatus === "CONNECTED" &&
              graphConnected
          ),
        }
      : null,
    deliveries,
    branches: branches.map((b) => ({ id: b.id, name: b.nameAr || b.name })),
    delayOptions: DELAY_OPTIONS,
    defaultMessageBody: DEFAULT_MESSAGE_BODY,
    reviewLinkExample,
    encryptionReady: canEncryptTokens(),
    webhookUrl: whatsAppWebhookUrl(),
    webhookVerifyToken: Boolean(creds.webhookVerifyToken),
    platformWebhookConfigured: Boolean(creds.webhookVerifyToken),
    platformReady: Boolean(platformToken),
    stats,
    charts: {
      messagesPerDay: Object.entries(messagesPerDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      ...rates,
    },
    templates,
    health,
    profile: profile
      ? {
          businessName: profile.businessName,
          wizardCompleted: Boolean(profile.wizardCompletedAt),
          lastHealthOk: profile.lastHealthOk,
          features: {
            afterVisit: profile.featureAfterVisit,
            reservation: profile.featureReservation,
            gift: profile.featureGift,
            order: profile.featureOrder,
            review: profile.featureReview,
          },
        }
      : null,
    notifications,
    dashboardSummary: {
      connectionStatus:
        connection?.connectionStatus === "CONNECTED" &&
        connection?.isActive &&
        connection.phoneNumberId &&
        graphConnected
          ? "CONNECTED"
          : "NOT_CONNECTED",
      businessName: profile?.businessName || restaurant?.nameAr || restaurant?.name || "—",
      phoneNumber: connection?.businessPhone || "—",
      templateCount: templates.length,
      deliveryPercent: rates.deliveryRate,
      messagesToday,
      failures: stats.failed,
      healthOk: probe.ok,
    },
  };
}

async function persistHealthProfile(restaurantId: string, ok: boolean, issues: string[]) {
  await prisma.whatsAppBusinessProfile.upsert({
    where: { restaurantId },
    create: {
      restaurantId,
      lastHealthCheckAt: new Date(),
      lastHealthOk: ok,
      healthIssues: issues,
    },
    update: {
      lastHealthCheckAt: new Date(),
      lastHealthOk: ok,
      healthIssues: issues,
    },
  });
}

export async function probeRestaurantWhatsAppHealth(
  restaurantId: string,
  cached?: {
    connection: {
      wabaId: string | null;
      phoneNumberId: string;
      businessPhone: string | null;
      connectionStatus: string;
      isActive: boolean;
    } | null;
    platformToken: string | null;
    creds: Awaited<ReturnType<typeof resolveMetaCredentials>>;
    templateCount: number;
  }
): Promise<{ health: WhatsAppHealthCheck[]; ok: boolean; graphOk: boolean; issues: string[] }> {
  const [connection, platformToken, creds] = cached
    ? [cached.connection, cached.platformToken, cached.creds]
    : await Promise.all([
        prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } }),
        resolveWhatsAppAccessToken(),
        resolveMetaCredentials(),
      ]);

  const issues: string[] = [];
  const health: WhatsAppHealthCheck[] = [];
  const webhookConfigured = Boolean(creds.webhookVerifyToken);

  health.push({
    id: "webhook",
    labelAr: "Webhook",
    ok: webhookConfigured,
    detail: webhookConfigured
      ? "Verify token configured (platform)"
      : "Platform webhook verify token missing — set in Super Admin → Meta",
  });
  if (!webhookConfigured) issues.push("Verify Token غير مضبوط على المنصة");

  if (!platformToken) {
    health.push({
      id: "token",
      labelAr: "Token Expiration",
      ok: false,
      detail: "WhatsApp Access Token is required",
    });
    health.push({ id: "cloud_api", labelAr: "Cloud API", ok: false, detail: "Not connected" });
    health.push({ id: "phone", labelAr: "Phone Number Status", ok: false, detail: "Phone Number ID missing" });
    health.push({ id: "business", labelAr: "Business Verification", ok: false, detail: "WABA unreachable" });
    health.push({
      id: "templates",
      labelAr: "Template Sync",
      ok: false,
      detail: "Sync templates from Meta",
    });
    issues.push("WhatsApp Access Token is required");
    return { health, ok: false, graphOk: false, issues };
  }

  health.push({
    id: "token",
    labelAr: "Token Expiration",
    ok: true,
    detail: "Platform WhatsApp token configured",
  });

  if (!connection?.wabaId || !connection.phoneNumberId) {
    health.push({ id: "cloud_api", labelAr: "Cloud API", ok: false, detail: "Not connected" });
    health.push({ id: "phone", labelAr: "Phone Number Status", ok: false, detail: "Phone Number ID missing" });
    health.push({ id: "business", labelAr: "Business Verification", ok: false, detail: "WABA ID missing" });
    health.push({
      id: "templates",
      labelAr: "Template Sync",
      ok: false,
      detail: "Sync templates from Meta",
    });
    issues.push("WhatsApp غير متصل");
    return { health, ok: false, graphOk: false, issues };
  }

  let wabaOk = false;
  let phoneOk = false;
  let phoneDetail = connection.businessPhone || "—";
  let templateCount = cached?.templateCount ?? 0;
  let templateOk = templateCount > 0;

  try {
    const nums = await fetchWabaPhoneNumbers(connection.wabaId, platformToken);
    const match = nums.data?.find((n) => n.id === connection.phoneNumberId);
    wabaOk = Boolean(match);
    if (match?.display_phone_number) phoneDetail = match.display_phone_number;
    if (!wabaOk) issues.push("Phone not listed on WABA");
  } catch (e) {
    issues.push(e instanceof Error ? e.message : "WABA phone_numbers failed");
  }

  try {
    const phone = await graphGet<{
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
      status?: string;
    }>(`/${connection.phoneNumberId}`, platformToken, {
      fields: "display_phone_number,verified_name,quality_rating,status",
    });
    phoneOk = Boolean(phone.display_phone_number);
    if (phone.display_phone_number) phoneDetail = phone.display_phone_number;
    if (phone.status) phoneDetail = `${phoneDetail} (${phone.status})`;
    if (!phoneOk) issues.push("Phone lookup failed");
  } catch (e) {
    issues.push(`Cloud API: ${e instanceof Error ? e.message : "Phone lookup failed"}`);
  }

  if (!templateOk) {
    try {
      const templates = await fetchWabaMessageTemplates(connection.wabaId, platformToken);
      templateCount = templates.data?.length ?? 0;
      templateOk = templateCount > 0;
    } catch (e) {
      issues.push(e instanceof Error ? e.message : "Template sync failed");
    }
  }

  let webhookSubscribed = false;
  if (webhookConfigured) {
    try {
      webhookSubscribed = await checkWabaSubscription(connection.wabaId, platformToken);
      if (!webhookSubscribed) issues.push("Webhook غير مشترك");
    } catch {
      issues.push("Webhook subscription check failed");
    }
  }

  const graphOk = wabaOk && phoneOk;
  health.push({
    id: "cloud_api",
    labelAr: "Cloud API",
    ok: graphOk,
    detail: graphOk ? "Graph API reachable" : issues.find((i) => i.startsWith("Cloud API")) || "Not connected",
  });
  health.push({
    id: "phone",
    labelAr: "Phone Number Status",
    ok: phoneOk,
    detail: phoneOk ? phoneDetail : "Phone lookup failed",
  });
  health.push({
    id: "business",
    labelAr: "Business Verification",
    ok: wabaOk,
    detail: wabaOk ? `WABA ${connection.wabaId}` : "WABA phone_numbers failed",
  });
  health.push({
    id: "templates",
    labelAr: "Template Sync",
    ok: templateOk,
    detail: templateOk ? `${templateCount} template(s)` : "Template sync failed",
  });

  const ok = graphOk && webhookConfigured;
  return { health, ok, graphOk, issues };
}

export async function syncTemplatesFromMeta(restaurantId: string): Promise<WhatsAppTemplateRow[]> {
  const connection = await prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId },
  });
  const accessToken = await resolveWhatsAppAccessToken();
  if (!connection?.wabaId || !accessToken) {
    return [];
  }

  const data = await graphGet<{
    data?: Array<{
      name: string;
      language: string;
      status: string;
      category: string;
      last_updated_time?: string;
    }>;
  }>(`/${connection.wabaId}/message_templates`, accessToken, { limit: "50" });

  return (data.data || []).map((t) => ({
    name: t.name,
    language: t.language,
    status: t.status,
    category: t.category,
    lastUpdated: t.last_updated_time || null,
  }));
}

export async function testWhatsAppConnection(restaurantId: string) {
  const refresh = await refreshRestaurantWhatsAppConnection(restaurantId);
  if (!refresh.ok) {
    return { ok: false, error: refresh.error || "Connection test failed" };
  }
  return { ok: true, phone: { display_phone_number: refresh.displayPhone } };
}

export async function disconnectWhatsAppBusiness(restaurantId: string) {
  const existing = await prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId },
  });
  if (!existing) return null;

  return prisma.whatsAppBusinessConnection.update({
    where: { restaurantId },
    data: { isActive: false, connectionStatus: "NOT_CONNECTED" },
  });
}

export { DEFAULT_AUTOMATION, automationFromRow, sendTestWhatsAppMessage, getOrCreateAutomation };
