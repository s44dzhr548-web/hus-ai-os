import prisma from "@/lib/prisma";
import { resolveMetaCredentials, isMetaOAuthReady } from "@/lib/platform/meta-config";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import {
  discoverWhatsAppAccountsFromPlatform,
  subscribeWabaWebhook,
  checkWabaSubscription,
  getEmbeddedSignupConfigId,
  type DiscoveredAccounts,
  type DiscoveredPhone,
} from "@/lib/marketing/whatsapp-oauth";
import { syncTemplatesFromMeta, testWhatsAppConnection } from "@/lib/marketing/whatsapp-business";
import { getOrCreateAutomation } from "@/lib/after-visit-whatsapp/service";
import { DEFAULT_AUTOMATION } from "@/lib/after-visit-whatsapp/types";
import {
  connectRestaurantFromPlatformDiscovery,
  completeEmbeddedSignup,
  saveRestaurantWhatsAppConnection,
} from "@/lib/marketing/whatsapp-connection-service";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export async function getOrCreateWizardSession(restaurantId: string) {
  const existing = await prisma.whatsAppWizardSession.findUnique({ where: { restaurantId } });
  if (existing && existing.expiresAt > new Date()) return existing;
  if (existing) {
    await prisma.whatsAppWizardSession.delete({ where: { restaurantId } });
  }
  return prisma.whatsAppWizardSession.create({
    data: {
      restaurantId,
      step: 1,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
}

export async function getOrCreateProfile(restaurantId: string) {
  const existing = await prisma.whatsAppBusinessProfile.findUnique({ where: { restaurantId } });
  if (existing) return existing;
  return prisma.whatsAppBusinessProfile.create({ data: { restaurantId } });
}

export async function fetchWizardState(restaurantId: string) {
  const [session, profile, connection, automation] = await Promise.all([
    getOrCreateWizardSession(restaurantId),
    getOrCreateProfile(restaurantId),
    prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } }),
    getOrCreateAutomation(restaurantId),
  ]);

  const discovered = (session.discoveredJson as DiscoveredAccounts | null) || { phones: [] };
  const [oauthReady, platformToken] = await Promise.all([isMetaOAuthReady(), resolveWhatsAppAccessToken()]);
  const platformReady = oauthReady && Boolean(platformToken);
  const hasOAuthSession = Boolean(session.accessTokenEnc || discovered.phones.length);

  return {
    step: session.step,
    oauthReady: platformReady,
    platformTokenReady: Boolean(platformToken),
    embeddedSignupConfigId: getEmbeddedSignupConfigId(),
    hasOAuthSession,
    discovered,
    selected: {
      wabaId: session.selectedWabaId,
      phoneNumberId: session.selectedPhoneNumberId,
      businessName: session.selectedBusinessName || profile.businessName,
      displayPhone: session.selectedDisplayPhone || connection?.businessPhone,
    },
    connection: connection
      ? {
          connected: Boolean(
            connection.isActive &&
              connection.phoneNumberId &&
              connection.connectionStatus === "CONNECTED" &&
              platformToken
          ),
          wabaId: connection.wabaId,
          phoneNumberId: connection.phoneNumberId,
          businessPhone: connection.businessPhone,
          metaBusinessId: connection.metaBusinessId,
          connectionStatus: connection.connectionStatus,
        }
      : null,
    webhookReady: Boolean(profile.webhookVerifiedAt),
    features: {
      afterVisit: profile.featureAfterVisit,
      reservation: profile.featureReservation,
      gift: profile.featureGift,
      order: profile.featureOrder,
      review: profile.featureReview,
    },
    automationEnabled: automation.isEnabled,
    wizardCompleted: Boolean(profile.wizardCompletedAt),
    templates: connection?.isActive ? await syncTemplatesFromMeta(restaurantId).catch(() => []) : [],
  };
}

export async function saveWizardSelection(
  restaurantId: string,
  phoneNumberId: string
) {
  const session = await prisma.whatsAppWizardSession.findUnique({ where: { restaurantId } });
  if (!session?.discoveredJson) throw new Error("No discovered accounts — connect Meta first");

  const discovered = session.discoveredJson as DiscoveredAccounts;
  const phone = discovered.phones.find((p) => p.id === phoneNumberId);
  if (!phone) throw new Error("Phone number not found");

  return prisma.whatsAppWizardSession.update({
    where: { restaurantId },
    data: {
      step: 4,
      selectedPhoneNumberId: phone.id,
      selectedWabaId: phone.wabaId,
      selectedBusinessName: phone.verifiedName || phone.businessName,
      selectedDisplayPhone: phone.displayPhone,
    },
  });
}

export async function finalizeWizardConnection(restaurantId: string, userId?: string) {
  const session = await prisma.whatsAppWizardSession.findUnique({ where: { restaurantId } });
  if (!session?.selectedPhoneNumberId || !session.selectedWabaId) {
    throw new Error("Complete phone selection first");
  }

  const discovered = (session.discoveredJson as DiscoveredAccounts | null) || { phones: [] };
  const phone = discovered.phones.find((p) => p.id === session.selectedPhoneNumberId);

  await saveRestaurantWhatsAppConnection({
    restaurantId,
    metaBusinessId: phone?.businessId || session.selectedWabaId,
    wabaId: session.selectedWabaId,
    phoneNumberId: session.selectedPhoneNumberId,
    displayPhoneNumber: session.selectedDisplayPhone || phone?.displayPhone || "",
    businessName: session.selectedBusinessName || phone?.verifiedName,
    connectedByUserId: userId,
  });

  await prisma.whatsAppWizardSession.update({
    where: { restaurantId },
    data: { step: 5 },
  });

  return { ok: true };
}

export async function verifyWizardWebhook(restaurantId: string) {
  const connection = await prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } });
  if (!connection?.wabaId) {
    throw new Error("Connection not saved");
  }
  const accessToken = await resolveWhatsAppAccessToken();
  if (!accessToken) {
    throw new Error("WhatsApp Access Token is required");
  }
  const subscribed = await subscribeWabaWebhook(connection.wabaId, accessToken);
  const active = subscribed || (await checkWabaSubscription(connection.wabaId, accessToken));

  if (active) {
    await prisma.whatsAppBusinessProfile.update({
      where: { restaurantId },
      data: { webhookVerifiedAt: new Date() },
    });
    await prisma.whatsAppWizardSession.update({
      where: { restaurantId },
      data: { step: 6 },
    });
  }

  return { ok: active };
}

export async function completeWizard(
  restaurantId: string,
  features: {
    afterVisit?: boolean;
    reservation?: boolean;
    gift?: boolean;
    order?: boolean;
    review?: boolean;
  }
) {
  await prisma.whatsAppBusinessProfile.update({
    where: { restaurantId },
    data: {
      featureAfterVisit: features.afterVisit ?? true,
      featureReservation: features.reservation ?? false,
      featureGift: features.gift ?? false,
      featureOrder: features.order ?? false,
      featureReview: features.review ?? true,
      wizardCompletedAt: new Date(),
    },
  });

  if (features.afterVisit) {
    await getOrCreateAutomation(restaurantId);
    await prisma.afterVisitWhatsAppAutomation.update({
      where: { restaurantId },
      data: { isEnabled: true },
    });
  }

  await prisma.whatsAppWizardSession.update({
    where: { restaurantId },
    data: { step: 8 },
  });
}

export async function runWhatsAppHealthCheck(restaurantId: string) {
  const [connection, profile] = await Promise.all([
    prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } }),
    prisma.whatsAppBusinessProfile.findUnique({ where: { restaurantId } }),
  ]);

  const issues: string[] = [];
  let ok = true;

  if (!connection?.isActive || !connection.phoneNumberId) {
    issues.push("WhatsApp غير متصل");
    ok = false;
  } else {
    const platformToken = await resolveWhatsAppAccessToken();
    if (!platformToken) {
      issues.push("WhatsApp Access Token is required");
      ok = false;
    }
    const test = await testWhatsAppConnection(restaurantId);
    if (!test.ok) {
      issues.push(`Cloud API: ${test.error}`);
      ok = false;
    }
    if (connection.wabaId && platformToken) {
      try {
        const sub = await checkWabaSubscription(connection.wabaId, platformToken);
        if (!sub) {
          issues.push("Webhook غير مشترك");
          ok = false;
        }
      } catch {
        issues.push("Platform token invalid");
        ok = false;
      }
    }
    try {
      const templates = await syncTemplatesFromMeta(restaurantId);
      if (!templates.length) {
        issues.push("لا توجد قوالب معتمدة");
        ok = false;
      }
    } catch {
      issues.push("فشل مزامنة القوالب");
      ok = false;
    }
  }

  const creds = await resolveMetaCredentials();
  if (!creds.webhookVerifyToken && !profile?.verifyTokenEnc) {
    issues.push("Verify Token غير مضبوط");
    ok = false;
  }

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

  if (!ok) {
    const existing = await prisma.whatsAppOwnerNotification.findFirst({
      where: {
        restaurantId,
        kind: "HEALTH_ALERT",
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!existing) {
      await prisma.whatsAppOwnerNotification.create({
        data: {
          restaurantId,
          kind: "HEALTH_ALERT",
          titleAr: "تنبيه واتساب الأعمال",
          messageAr: issues.join(" · "),
        },
      });
    }
  }

  return { ok, issues };
}

export async function storeOAuthDiscovery(restaurantId: string, _accessToken?: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, nameAr: true },
  });
  const hint = restaurant?.nameAr || restaurant?.name;
  const discovered = await discoverWhatsAppAccountsFromPlatform(hint);

  await getOrCreateWizardSession(restaurantId);
  await prisma.whatsAppWizardSession.update({
    where: { restaurantId },
    data: {
      step: discovered.phones.length === 1 ? 4 : 3,
      accessTokenEnc: null,
      discoveredJson: discovered as object,
      ...(discovered.phones.length === 1
        ? {
            selectedPhoneNumberId: discovered.phones[0].id,
            selectedWabaId: discovered.phones[0].wabaId,
            selectedBusinessName: discovered.phones[0].verifiedName || discovered.phones[0].businessName,
            selectedDisplayPhone: discovered.phones[0].displayPhone,
          }
        : {}),
    },
  });

  return discovered;
}

export async function storePlatformDiscovery(restaurantId: string) {
  return storeOAuthDiscovery(restaurantId);
}

export { connectRestaurantFromPlatformDiscovery, completeEmbeddedSignup };

export type { DiscoveredPhone, DiscoveredAccounts };
