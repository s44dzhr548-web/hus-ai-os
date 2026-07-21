import type { WhatsAppDeliveryStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import {
  getOrCreateAutomation,
  automationFromRow,
  sendTestWhatsAppMessage,
  processWhatsAppQueue,
} from "@/lib/after-visit-whatsapp/service";
import { DEFAULT_AUTOMATION, DEFAULT_MESSAGE_BODY, DELAY_OPTIONS } from "@/lib/after-visit-whatsapp/types";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";
import { runWhatsAppHealthCheck } from "@/lib/marketing/whatsapp-setup";

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

  const [automation, connection, deliveries, branches, restaurant, statusCounts, profile, notifications] =
    await Promise.all([
      getOrCreateAutomation(restaurantId),
      prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } }),
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
    ]);

  void runWhatsAppHealthCheck(restaurantId).catch(console.error);

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
  const platformToken = await resolveWhatsAppAccessToken();
  if (connection?.wabaId && platformToken) {
    try {
      templates = await syncTemplatesFromMeta(restaurantId);
    } catch {
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
  } else if (connection) {
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

  const health = buildHealthChecks(connection, templates.length, profile, Boolean(platformToken));

  return {
    automation: automationFromRow(automation),
    connection: connection
      ? {
          id: connection.id,
          wabaId: connection.wabaId,
          phoneNumberId: connection.phoneNumberId,
          businessPhone: connection.businessPhone,
          templateName: connection.templateName,
          templateLanguage: connection.templateLanguage,
          isActive: connection.isActive,
          connectedAt: connection.connectedAt,
          hasToken: Boolean(platformToken),
          connected: Boolean(connection.isActive && connection.phoneNumberId && platformToken),
        }
      : null,
    deliveries,
    branches: branches.map((b) => ({ id: b.id, name: b.nameAr || b.name })),
    delayOptions: DELAY_OPTIONS,
    defaultMessageBody: DEFAULT_MESSAGE_BODY,
    reviewLinkExample,
    encryptionReady: canEncryptTokens(),
    webhookUrl: whatsAppWebhookUrl(),
    webhookVerifyToken: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
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
        connection?.isActive && connection.phoneNumberId && platformToken
          ? "CONNECTED"
          : "NOT_CONNECTED",
      businessName: profile?.businessName || restaurant?.nameAr || restaurant?.name || "—",
      phoneNumber: connection?.businessPhone || "—",
      templateCount: templates.length,
      deliveryPercent: rates.deliveryRate,
      messagesToday,
      failures: stats.failed,
      healthOk: profile?.lastHealthOk ?? null,
    },
  };
}

function buildHealthChecks(
  connection: {
    isActive: boolean;
    accessTokenEnc: string;
    phoneNumberId: string;
    wabaId: string | null;
  } | null,
  templateCount: number,
  profile: { verifyTokenEnc: string | null; webhookVerifiedAt: Date | null } | null,
  hasPlatformToken: boolean
): WhatsAppHealthCheck[] {
  const webhookOk = Boolean(
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || profile?.verifyTokenEnc || profile?.webhookVerifiedAt
  );
  const connected = Boolean(connection?.isActive && connection?.phoneNumberId && hasPlatformToken);

  return [
    {
      id: "webhook",
      labelAr: "Webhook",
      ok: webhookOk,
      detail: webhookOk ? "Verify token configured" : "WHATSAPP_WEBHOOK_VERIFY_TOKEN missing",
    },
    {
      id: "cloud_api",
      labelAr: "Cloud API",
      ok: connected,
      detail: connected ? "Connection active" : "Not connected",
    },
    {
      id: "token",
      labelAr: "Token Expiration",
      ok: hasPlatformToken,
      detail: hasPlatformToken
        ? "Platform WhatsApp token configured"
        : "WhatsApp Access Token is required",
    },
    {
      id: "phone",
      labelAr: "Phone Number Status",
      ok: Boolean(connection?.phoneNumberId),
      detail: connection?.phoneNumberId || "Phone Number ID missing",
    },
    {
      id: "business",
      labelAr: "Business Verification",
      ok: Boolean(connection?.wabaId),
      detail: connection?.wabaId
        ? "WABA ID configured"
        : "Add Business Account ID in Meta",
    },
    {
      id: "templates",
      labelAr: "Template Sync",
      ok: templateCount > 0,
      detail: templateCount ? `${templateCount} template(s)` : "Sync templates from Meta",
    },
  ];
}

export async function syncTemplatesFromMeta(restaurantId: string): Promise<WhatsAppTemplateRow[]> {
  const connection = await prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId },
  });
  const accessToken = await resolveWhatsAppAccessToken();
  if (!connection?.wabaId || !accessToken) {
    return [];
  }

  const url = `https://graph.facebook.com/v23.0/${connection.wabaId}/message_templates?limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: Array<{
      name: string;
      language: string;
      status: string;
      category: string;
      last_updated_time?: string;
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }

  return (data.data || []).map((t) => ({
    name: t.name,
    language: t.language,
    status: t.status,
    category: t.category,
    lastUpdated: t.last_updated_time || null,
  }));
}

export async function testWhatsAppConnection(restaurantId: string) {
  const connection = await prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId },
  });
  if (!connection?.phoneNumberId) {
    return { ok: false, error: "Connection not configured" };
  }

  const accessToken = await resolveWhatsAppAccessToken();
  if (!accessToken) {
    return { ok: false, error: "WhatsApp Access Token is required" };
  }

  const url = `https://graph.facebook.com/v23.0/${connection.phoneNumberId}?fields=display_phone_number,verified_name`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: (data as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`,
    };
  }
  return { ok: true, phone: data };
}

export async function disconnectWhatsAppBusiness(restaurantId: string) {
  const existing = await prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId },
  });
  if (!existing) return null;

  return prisma.whatsAppBusinessConnection.update({
    where: { restaurantId },
    data: { isActive: false },
  });
}

export { DEFAULT_AUTOMATION, automationFromRow, sendTestWhatsAppMessage, getOrCreateAutomation };
