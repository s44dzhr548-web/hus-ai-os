import prisma from "@/lib/prisma";
import { WHATSAPP_GRAPH, sanitizeAccessToken } from "@/lib/marketing/whatsapp-graph-api";
import { detectReservationIntent, proposeReservationDraft } from "@/lib/whatsapp-inbox/service";

type WebhookMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; mime_type?: string; caption?: string };
  button?: { text?: string; payload?: string };
  interactive?: { type?: string; button_reply?: { title?: string }; list_reply?: { title?: string } };
};

type WebhookStatus = {
  id: string;
  status: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ title?: string; message?: string }>;
};

type WebhookValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
};

function extractInboundText(msg: WebhookMessage): string {
  if (msg.text?.body) return msg.text.body;
  if (msg.button?.text) return msg.button.text;
  if (msg.interactive?.button_reply?.title) return msg.interactive.button_reply.title;
  if (msg.interactive?.list_reply?.title) return msg.interactive.list_reply.title;
  if (msg.image?.caption) return msg.image.caption;
  if (msg.document?.caption) return msg.document.caption;
  if (msg.video?.caption) return msg.video.caption;
  return "";
}

function mapMessageType(msg: WebhookMessage): string {
  const t = msg.type || "text";
  if (t === "text" || msg.button || msg.interactive) return "TEXT";
  return t.toUpperCase();
}

async function resolveMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
  const token = sanitizeAccessToken(accessToken);
  if (!token) return null;
  try {
    const meta = await fetch(`${WHATSAPP_GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await meta.json()) as { url?: string };
    return data.url || null;
  } catch {
    return null;
  }
}

async function resolveRestaurantByPhoneNumberId(phoneNumberId: string) {
  return prisma.whatsAppBusinessConnection.findFirst({
    where: { phoneNumberId, isActive: true },
    select: {
      restaurantId: true,
      wabaId: true,
      phoneNumberId: true,
    },
  });
}

async function upsertInboundConversation(params: {
  restaurantId: string;
  wabaId: string;
  phoneNumberId: string;
  waId: string;
  displayName?: string;
}) {
  const contact = await prisma.whatsAppContact.upsert({
    where: { restaurantId_waId: { restaurantId: params.restaurantId, waId: params.waId } },
    create: {
      restaurantId: params.restaurantId,
      waId: params.waId,
      wabaId: params.wabaId,
      displayName: params.displayName,
    },
    update: {
      displayName: params.displayName || undefined,
      wabaId: params.wabaId,
    },
  });

  const conversation = await prisma.whatsAppConversation.upsert({
    where: {
      restaurantId_contactId_phoneNumberId: {
        restaurantId: params.restaurantId,
        contactId: contact.id,
        phoneNumberId: params.phoneNumberId,
      },
    },
    create: {
      restaurantId: params.restaurantId,
      contactId: contact.id,
      wabaId: params.wabaId,
      phoneNumberId: params.phoneNumberId,
      status: "OPEN",
    },
    update: {},
  });

  return { contact, conversation };
}

export async function processWhatsAppWebhookPayload(body: unknown, accessToken?: string | null) {
  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> }).entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.metadata?.phone_number_id) continue;

      const phoneNumberId = value.metadata.phone_number_id;
      const connection = await resolveRestaurantByPhoneNumberId(phoneNumberId);
      if (!connection?.wabaId) continue;

      const restaurantId = connection.restaurantId;
      const wabaId = connection.wabaId;

      for (const st of value.statuses || []) {
        await applyMessageStatus(st);
      }

      for (const msg of value.messages || []) {
        if (!msg.from || !msg.id) continue;

        const contactName = value.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name;
        const { conversation } = await upsertInboundConversation({
          restaurantId,
          wabaId,
          phoneNumberId,
          waId: msg.from,
          displayName: contactName,
        });

        const text = extractInboundText(msg);
        const messageType = mapMessageType(msg);
        const ts = msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date();

        let mediaUrl: string | null = null;
        let mediaMime: string | null = null;
        const mediaId =
          msg.image?.id || msg.document?.id || msg.audio?.id || msg.video?.id || null;
        if (mediaId && accessToken) {
          mediaUrl = await resolveMediaUrl(mediaId, accessToken);
          mediaMime =
            msg.image?.mime_type ||
            msg.document?.mime_type ||
            msg.audio?.mime_type ||
            msg.video?.mime_type ||
            null;
        }

        const existing = await prisma.whatsAppMessage.findUnique({
          where: { providerMessageId: msg.id },
        });
        if (existing) continue;

        await prisma.whatsAppMessage.create({
          data: {
            restaurantId,
            conversationId: conversation.id,
            wabaId,
            phoneNumberId,
            direction: "INBOUND",
            messageType,
            bodyText: text || null,
            mediaUrl,
            mediaMimeType: mediaMime,
            mediaCaption: text || null,
            providerMessageId: msg.id,
            status: "DELIVERED",
            deliveredAt: ts,
            metadataJson: mediaId ? { mediaId } : undefined,
          },
        });

        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: ts,
            lastMessagePreview: (text || `[${messageType}]`).slice(0, 500),
            lastCustomerMessageAt: ts,
            unreadCount: { increment: 1 },
            status: "OPEN",
          },
        });

        if (text && detectReservationIntent(text)) {
          await proposeReservationDraft(restaurantId, conversation.id, contactName);
        }

        const isOptOut =
          /إلغاء\s*الاشتراك|unsubscribe|opt.?out|stop/i.test(text) ||
          msg.button?.payload === "OPT_OUT";
        if (isOptOut) {
          await handleOptOut(msg.from);
        }
      }
    }
  }
}

async function applyMessageStatus(st: WebhookStatus) {
  const ts = st.timestamp ? new Date(parseInt(st.timestamp, 10) * 1000) : new Date();

  const inboxMsg = await prisma.whatsAppMessage.findUnique({
    where: { providerMessageId: st.id },
  });
  if (inboxMsg) {
    const data: {
      status: string;
      deliveredAt?: Date;
      readAt?: Date;
      failedReason?: string;
    } = { status: st.status.toUpperCase() };

    if (st.status === "delivered") data.deliveredAt = ts;
    if (st.status === "read") data.readAt = ts;
    if (st.status === "failed") {
      data.failedReason = st.errors?.[0]?.message || st.errors?.[0]?.title || "Delivery failed";
    }
    if (st.status === "sent") data.status = "SENT";

    await prisma.whatsAppMessage.update({ where: { id: inboxMsg.id }, data });
  }

  const delivery = await prisma.whatsAppMessageDelivery.findFirst({
    where: { providerMessageId: st.id },
  });
  if (!delivery) return;

  if (st.status === "delivered") {
    await prisma.whatsAppMessageDelivery.update({
      where: { id: delivery.id },
      data: { status: "DELIVERED", deliveredAt: ts },
    });
  } else if (st.status === "read") {
    await prisma.whatsAppMessageDelivery.update({
      where: { id: delivery.id },
      data: { status: "READ", readAt: ts },
    });
  } else if (st.status === "failed") {
    const reason = st.errors?.[0]?.message || st.errors?.[0]?.title || "Delivery failed";
    await prisma.whatsAppMessageDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", failedReason: reason },
    });
  } else if (st.status === "sent") {
    await prisma.whatsAppMessageDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", sentAt: ts },
    });
  }
}

async function handleOptOut(fromPhone: string) {
  const profile = await prisma.customerProfile.findFirst({
    where: { customerPhone: { contains: fromPhone.slice(-9) } },
    orderBy: { updatedAt: "desc" },
  });
  if (profile) {
    await prisma.customerProfile.update({
      where: { id: profile.id },
      data: { marketingConsent: false, marketingConsentAt: null },
    });
  }

  const pending = await prisma.whatsAppMessageDelivery.findMany({
    where: {
      phone: { contains: fromPhone.slice(-9) },
      status: { in: ["QUEUED", "SENT"] },
    },
  });
  for (const d of pending) {
    await prisma.whatsAppMessageDelivery.update({
      where: { id: d.id },
      data: { status: "OPTED_OUT", failedReason: "Customer opted out via WhatsApp" },
    });
  }
}
