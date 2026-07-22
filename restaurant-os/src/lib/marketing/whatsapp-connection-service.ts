import prisma from "@/lib/prisma";
import { DEFAULT_AUTOMATION } from "@/lib/after-visit-whatsapp/types";
import {
  discoverWhatsAppAccountsFromPlatform,
  subscribeWabaWebhook,
  checkWabaSubscription,
  fetchWabaPhoneNumbers,
  fetchWabaMessageTemplates,
  type DiscoveredPhone,
} from "@/lib/marketing/whatsapp-oauth";
import { syncTemplatesFromMeta } from "@/lib/marketing/whatsapp-business";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";

export type RestaurantWhatsAppLinkInput = {
  restaurantId: string;
  metaBusinessId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  businessName?: string;
  connectedByUserId?: string;
};

function pickBestPhone(phones: DiscoveredPhone[], nameHint?: string): DiscoveredPhone | null {
  if (!phones.length) return null;
  if (nameHint) {
    const hint = nameHint.toLowerCase();
    const match = phones.find((p) =>
      [p.verifiedName, p.wabaName, p.businessName].some((s) => s?.toLowerCase().includes(hint))
    );
    if (match) return match;
  }
  return phones[0];
}

export async function saveRestaurantWhatsAppConnection(input: RestaurantWhatsAppLinkInput) {
  const platformToken = await resolveWhatsAppAccessToken();
  if (!platformToken) throw new Error("WhatsApp Access Token is required");

  await prisma.whatsAppBusinessConnection.upsert({
    where: { restaurantId: input.restaurantId },
    create: {
      restaurantId: input.restaurantId,
      metaBusinessId: input.metaBusinessId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      businessPhone: input.displayPhoneNumber,
      accessTokenEnc: null,
      connectionStatus: "CONNECTED",
      templateName: DEFAULT_AUTOMATION.templateName,
      isActive: true,
      connectedByUserId: input.connectedByUserId,
    },
    update: {
      metaBusinessId: input.metaBusinessId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      businessPhone: input.displayPhoneNumber,
      accessTokenEnc: null,
      connectionStatus: "CONNECTED",
      isActive: true,
    },
  });

  if (input.businessName) {
    await prisma.whatsAppBusinessProfile.upsert({
      where: { restaurantId: input.restaurantId },
      create: {
        restaurantId: input.restaurantId,
        businessName: input.businessName,
        oauthConnectedAt: new Date(),
      },
      update: {
        businessName: input.businessName,
        oauthConnectedAt: new Date(),
      },
    });
  }

  await subscribeWabaWebhook(input.wabaId, platformToken);
  await syncTemplatesFromMeta(input.restaurantId).catch(() => []);

  return { connectionStatus: "CONNECTED" as const };
}

export async function connectRestaurantFromPlatformDiscovery(
  restaurantId: string,
  opts?: { nameHint?: string; connectedByUserId?: string }
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, nameAr: true, slug: true },
  });
  if (!restaurant) throw new Error("Restaurant not found");

  const hint = opts?.nameHint || restaurant.nameAr || restaurant.name;
  const discovered = await discoverWhatsAppAccountsFromPlatform(hint);
  let phone = pickBestPhone(discovered.phones, hint);

  if (!phone) {
    const existing = await prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId },
    });
    const platformToken = await resolveWhatsAppAccessToken();
    if (existing?.wabaId && existing.phoneNumberId && platformToken) {
      const nums = await fetchWabaPhoneNumbers(existing.wabaId, platformToken);
      const match = nums.data?.find((n) => n.id === existing.phoneNumberId);
      if (match) {
        phone = {
          id: existing.phoneNumberId,
          displayPhone: match.display_phone_number || existing.businessPhone || "",
          verifiedName: match.verified_name || hint,
          wabaId: existing.wabaId,
          wabaName: match.verified_name || hint,
          businessId: existing.metaBusinessId || existing.wabaId,
          businessName: hint,
        };
      }
    }
  }

  if (!phone) {
    throw new Error("No WhatsApp Business phone numbers found for this account");
  }

  return saveRestaurantWhatsAppConnection({
    restaurantId,
    metaBusinessId: phone.businessId,
    wabaId: phone.wabaId,
    phoneNumberId: phone.id,
    displayPhoneNumber: phone.displayPhone,
    businessName: phone.verifiedName || phone.wabaName || hint,
    connectedByUserId: opts?.connectedByUserId,
  });
}

export async function completeEmbeddedSignup(
  restaurantId: string,
  payload: {
    wabaId: string;
    phoneNumberId: string;
    metaBusinessId?: string;
    displayPhoneNumber?: string;
    businessName?: string;
  },
  connectedByUserId?: string
) {
  const platformToken = await resolveWhatsAppAccessToken();
  if (!platformToken) throw new Error("WhatsApp Access Token is required");

  let displayPhone = payload.displayPhoneNumber || "";
  let businessName = payload.businessName || "";

  if (!displayPhone) {
    const nums = await fetchWabaPhoneNumbers(payload.wabaId, platformToken);
    const match = nums.data?.find((n) => n.id === payload.phoneNumberId);
    displayPhone = match?.display_phone_number || "";
    businessName = businessName || match?.verified_name || "";
  }

  const metaBusinessId = payload.metaBusinessId || process.env.META_BUSINESS_ID?.trim() || "";

  const result = await saveRestaurantWhatsAppConnection({
    restaurantId,
    metaBusinessId,
    wabaId: payload.wabaId,
    phoneNumberId: payload.phoneNumberId,
    displayPhoneNumber: displayPhone,
    businessName,
    connectedByUserId,
  });

  await fetchWabaMessageTemplates(payload.wabaId, platformToken).catch(() => []);
  const subscribed = await checkWabaSubscription(payload.wabaId, platformToken);

  return { ...result, webhookSubscribed: subscribed };
}

export async function verifyRestaurantWhatsAppLink(restaurantId: string) {
  const [connection, platformToken, creds] = await Promise.all([
    prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId } }),
    resolveWhatsAppAccessToken(),
    resolveMetaCredentials(),
  ]);

  if (!connection?.wabaId || !connection.phoneNumberId) {
    return { ok: false, issues: ["WhatsApp غير متصل"] };
  }
  if (!platformToken) {
    return { ok: false, issues: ["WhatsApp Access Token is required"] };
  }

  const issues: string[] = [];

  try {
    await fetchWabaPhoneNumbers(connection.wabaId, platformToken);
  } catch (e) {
    issues.push(e instanceof Error ? e.message : "Phone numbers fetch failed");
  }

  try {
    const templates = await fetchWabaMessageTemplates(connection.wabaId, platformToken);
    if (!templates.data?.length) issues.push("No message templates found");
  } catch (e) {
    issues.push(e instanceof Error ? e.message : "Template sync failed");
  }

  const webhookOk =
    Boolean(creds.webhookVerifyToken) &&
    (await checkWabaSubscription(connection.wabaId, platformToken));
  if (!webhookOk) issues.push("Webhook not subscribed");

  const ok = issues.length === 0;
  if (ok) {
    await prisma.whatsAppBusinessConnection.update({
      where: { restaurantId },
      data: { connectionStatus: "CONNECTED", isActive: true },
    });
    await prisma.whatsAppBusinessProfile.update({
      where: { restaurantId },
      data: { webhookVerifiedAt: new Date(), lastHealthOk: true, healthIssues: [] },
    });
  }

  return { ok, issues };
}
