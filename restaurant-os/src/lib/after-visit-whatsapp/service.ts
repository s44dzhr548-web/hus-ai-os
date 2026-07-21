import type { WhatsAppDeliveryStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { sendWhatsAppTemplateMessage } from "./cloud-api";
import { normalizeWhatsAppPhone, isValidCustomerPhone } from "./phone";
import { buildReviewUrl, resolveAppBaseUrl } from "./review-url";
import {
  AFTER_VISIT_EVENT,
  DEFAULT_AUTOMATION,
  MAX_SEND_ATTEMPTS,
  type AfterVisitAutomationConfig,
} from "./types";

export async function getOrCreateAutomation(restaurantId: string) {
  const existing = await prisma.afterVisitWhatsAppAutomation.findUnique({
    where: { restaurantId },
  });
  if (existing) return existing;
  return prisma.afterVisitWhatsAppAutomation.create({
    data: { restaurantId, ...DEFAULT_AUTOMATION },
  });
}

function automationFromRow(row: {
  isEnabled: boolean;
  delayMinutes: number;
  templateName: string;
  messageBody: string | null;
  reviewLinkBase: string | null;
  branchId: string | null;
  testPhone: string | null;
}): AfterVisitAutomationConfig {
  return {
    isEnabled: row.isEnabled,
    delayMinutes: row.delayMinutes,
    templateName: row.templateName,
    messageBody: row.messageBody,
    reviewLinkBase: row.reviewLinkBase,
    branchId: row.branchId,
    testPhone: row.testPhone,
  };
}

/** Fire-and-forget after session completion — never throws to caller */
export function triggerAfterVisitWhatsApp(params: {
  restaurantId: string;
  branchId?: string | null;
  visitId: string;
  sessionId: string;
}) {
  void queueAfterVisitWhatsApp(params).catch((err) => {
    console.error("[after-visit-whatsapp] queue failed", err);
  });
}

export async function queueAfterVisitWhatsApp(params: {
  restaurantId: string;
  branchId?: string | null;
  visitId: string;
  sessionId: string;
}) {
  const existing = await prisma.whatsAppMessageDelivery.findUnique({
    where: { visitId: params.visitId },
  });
  if (existing) {
    return existing;
  }

  const [automation, connection, visit, session, restaurant] = await Promise.all([
    getOrCreateAutomation(params.restaurantId),
    prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: params.restaurantId },
    }),
    prisma.customerVisit.findUnique({
      where: { id: params.visitId },
      include: { customerProfile: true },
    }),
    prisma.tableSession.findUnique({ where: { id: params.sessionId } }),
    prisma.restaurant.findUnique({
      where: { id: params.restaurantId },
      select: { slug: true, name: true, nameAr: true },
    }),
  ]);

  if (!visit || !restaurant) return null;

  if (automation.branchId && params.branchId && automation.branchId !== params.branchId) {
    return createSkippedDelivery({
      ...params,
      phone: visit.customerPhone || "",
      templateName: automation.templateName,
      status: "SKIPPED_DISABLED",
      reason: "Branch filter mismatch",
      customerProfileId: visit.customerProfileId,
    });
  }

  if (!automation.isEnabled) {
    return createSkippedDelivery({
      ...params,
      phone: visit.customerPhone || "",
      templateName: automation.templateName,
      status: "SKIPPED_DISABLED",
      reason: "Automation disabled",
      customerProfileId: visit.customerProfileId,
    });
  }

  if (!connection?.isActive) {
    return createSkippedDelivery({
      ...params,
      phone: visit.customerPhone || "",
      templateName: automation.templateName,
      status: "SKIPPED_NO_CONNECTION",
      reason: "No active WhatsApp Business connection",
      customerProfileId: visit.customerProfileId,
    });
  }

  const phoneRaw = visit.customerPhone || visit.customerProfile?.customerPhone;
  if (!isValidCustomerPhone(phoneRaw)) {
    return createSkippedDelivery({
      ...params,
      phone: phoneRaw || "",
      templateName: automation.templateName,
      status: "SKIPPED_NO_PHONE",
      reason: "Invalid or missing phone",
      customerProfileId: visit.customerProfileId,
    });
  }

  const profile = visit.customerProfile;
  if (!profile?.marketingConsent) {
    return createSkippedDelivery({
      ...params,
      phone: phoneRaw!,
      templateName: automation.templateName,
      status: "SKIPPED_NO_CONSENT",
      reason: "No WhatsApp marketing consent",
      customerProfileId: visit.customerProfileId,
    });
  }

  const phone = normalizeWhatsAppPhone(phoneRaw)!;
  const baseUrl = automation.reviewLinkBase || resolveAppBaseUrl();
  const reviewUrl = buildReviewUrl({
    baseUrl,
    slug: restaurant.slug,
    visitId: params.visitId,
    tableDisplay:
      visit.tableDisplayNumber ||
      session?.tableDisplayNumber ||
      (visit.tableNumber != null ? String(visit.tableNumber) : null),
  });

  const scheduledFor = new Date(Date.now() + automation.delayMinutes * 60 * 1000);

  const delivery = await prisma.whatsAppMessageDelivery.create({
    data: {
      restaurantId: params.restaurantId,
      customerProfileId: visit.customerProfileId,
      visitId: params.visitId,
      sessionId: params.sessionId,
      phone,
      templateName: automation.templateName,
      status: "QUEUED",
      eventType: AFTER_VISIT_EVENT,
      reviewUrl,
      scheduledFor,
    },
  });

  if (automation.delayMinutes === 0) {
    void processWhatsAppDeliveryById(delivery.id).catch(console.error);
  }

  return delivery;
}

async function createSkippedDelivery(params: {
  restaurantId: string;
  visitId: string;
  sessionId: string;
  phone: string;
  templateName: string;
  status: WhatsAppDeliveryStatus;
  reason: string;
  customerProfileId?: string | null;
}) {
  try {
    return await prisma.whatsAppMessageDelivery.create({
      data: {
        restaurantId: params.restaurantId,
        customerProfileId: params.customerProfileId,
        visitId: params.visitId,
        sessionId: params.sessionId,
        phone: params.phone || "unknown",
        templateName: params.templateName,
        status: params.status,
        eventType: AFTER_VISIT_EVENT,
        scheduledFor: new Date(),
        failedReason: params.reason,
      },
    });
  } catch {
    return null;
  }
}

export async function processWhatsAppQueue(limit = 20) {
  const now = new Date();
  const pending = await prisma.whatsAppMessageDelivery.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
      attemptCount: { lt: MAX_SEND_ATTEMPTS },
    },
    orderBy: { scheduledFor: "asc" },
    take: limit,
  });

  const results = [];
  for (const row of pending) {
    results.push(await processWhatsAppDeliveryById(row.id));
  }
  return results;
}

export async function processWhatsAppDeliveryById(deliveryId: string) {
  const delivery = await prisma.whatsAppMessageDelivery.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery || delivery.status !== "QUEUED") return delivery;

  if (delivery.attemptCount >= MAX_SEND_ATTEMPTS) {
    return prisma.whatsAppMessageDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        failedReason: "Max attempts exceeded",
      },
    });
  }

  const [connection, automation, visit, restaurant] = await Promise.all([
    prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: delivery.restaurantId },
    }),
    getOrCreateAutomation(delivery.restaurantId),
    prisma.customerVisit.findUnique({
      where: { id: delivery.visitId },
      include: { customerProfile: true },
    }),
    prisma.restaurant.findUnique({
      where: { id: delivery.restaurantId },
      select: { name: true, nameAr: true },
    }),
  ]);

  if (!connection?.isActive || !canEncryptTokens()) {
    return prisma.whatsAppMessageDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        attemptCount: { increment: 1 },
        failedReason: "WhatsApp connection unavailable",
      },
    });
  }

  if (!visit?.customerProfile?.marketingConsent) {
    return prisma.whatsAppMessageDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "SKIPPED_NO_CONSENT",
        failedReason: "Consent withdrawn",
      },
    });
  }

  let accessToken: string;
  try {
    accessToken = (await resolveWhatsAppAccessToken()) || "";
    if (!accessToken) {
      return prisma.whatsAppMessageDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          attemptCount: { increment: 1 },
          failedReason: "WhatsApp Access Token is required",
        },
      });
    }
  } catch {
    return prisma.whatsAppMessageDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        attemptCount: { increment: 1 },
        failedReason: "Token decryption failed",
      },
    });
  }

  const customerName = visit.customerName || "ضيفنا";
  const restaurantName = restaurant?.nameAr || restaurant?.name || "المطعم";
  const tableNumber =
    visit.tableDisplayNumber ||
    (visit.tableNumber != null ? String(visit.tableNumber) : "—");
  const reviewUrl = delivery.reviewUrl || resolveAppBaseUrl();

  const result = await sendWhatsAppTemplateMessage({
    phoneNumberId: connection.phoneNumberId,
    accessToken,
    toPhone: delivery.phone,
    templateName: delivery.templateName,
    languageCode: connection.templateLanguage,
    customerName,
    restaurantName,
    tableNumber,
    reviewUrl,
    messageBody: automation.messageBody,
  });

  if (result.ok) {
    return prisma.whatsAppMessageDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.messageId,
        attemptCount: { increment: 1 },
      },
    });
  }

  const finalStatus =
    result.retryable && delivery.attemptCount + 1 < MAX_SEND_ATTEMPTS
      ? "QUEUED"
      : "FAILED";

  return prisma.whatsAppMessageDelivery.update({
    where: { id: deliveryId },
    data: {
      status: finalStatus,
      attemptCount: { increment: 1 },
      failedReason: result.error,
      scheduledFor:
        finalStatus === "QUEUED"
          ? new Date(Date.now() + 2 * 60 * 1000)
          : delivery.scheduledFor,
    },
  });
}

export async function sendTestWhatsAppMessage(params: {
  restaurantId: string;
  testPhone: string;
  customerName?: string;
  tableNumber?: string;
}) {
  const [connection, automation, restaurant] = await Promise.all([
    prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: params.restaurantId },
    }),
    getOrCreateAutomation(params.restaurantId),
    prisma.restaurant.findUnique({
      where: { id: params.restaurantId },
      select: { slug: true, name: true, nameAr: true },
    }),
  ]);

  if (!connection?.isActive) {
    throw new Error("لا يوجد اتصال واتساب Business نشط");
  }

  const phone = normalizeWhatsAppPhone(params.testPhone);
  if (!phone) throw new Error("رقم الجوال غير صالح");

  const accessToken = await resolveWhatsAppAccessToken();
  if (!accessToken) throw new Error("WhatsApp Access Token is required");
  const baseUrl = automation.reviewLinkBase || resolveAppBaseUrl();
  const reviewUrl = buildReviewUrl({
    baseUrl,
    slug: restaurant?.slug || "demo",
    visitId: "test",
    tableDisplay: params.tableNumber || "1",
  });

  return sendWhatsAppTemplateMessage({
    phoneNumberId: connection.phoneNumberId,
    accessToken,
    toPhone: phone,
    templateName: automation.templateName,
    languageCode: connection.templateLanguage,
    customerName: params.customerName || "ضيفنا",
    restaurantName: restaurant?.nameAr || restaurant?.name || "المطعم",
    tableNumber: params.tableNumber || "1",
    reviewUrl,
    messageBody: automation.messageBody,
  });
}

export { automationFromRow };
