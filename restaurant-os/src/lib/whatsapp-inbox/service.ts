import prisma from "@/lib/prisma";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { syncTemplatesFromMeta } from "@/lib/marketing/whatsapp-business";
import { SESSION_WINDOW_MS, DEFAULT_QUICK_REPLIES } from "@/lib/whatsapp-inbox/constants";
import { logWhatsAppInboxAudit } from "@/lib/whatsapp-inbox/audit";
import {
  sendWhatsAppMediaMessage,
  sendWhatsAppTemplateMessageSimple,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp-inbox/send";

export function isWithinCustomerServiceWindow(lastCustomerMessageAt: Date | null | undefined): boolean {
  if (!lastCustomerMessageAt) return false;
  return Date.now() - lastCustomerMessageAt.getTime() < SESSION_WINDOW_MS;
}

export async function getRestaurantConnection(restaurantId: string) {
  return prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId },
  });
}

export async function assertConversationAccess(conversationId: string, restaurantId: string) {
  const conversation = await prisma.whatsAppConversation.findFirst({
    where: { id: conversationId, restaurantId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
      internalNotes: { orderBy: { createdAt: "desc" }, take: 50 },
      assignments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!conversation) throw new Error("Conversation not found");
  return conversation;
}

export async function listInboxConversations(
  restaurantId: string,
  opts?: { q?: string; status?: string }
) {
  const q = opts?.q?.trim();
  return prisma.whatsAppConversation.findMany({
    where: {
      restaurantId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(q ?
        {
          OR: [
            { contact: { displayName: { contains: q, mode: "insensitive" } } },
            { contact: { waId: { contains: q.replace(/\D/g, "") } } },
            { lastMessagePreview: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    },
    include: {
      contact: true,
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });
}

export async function getQuickReplies(restaurantId: string): Promise<string[]> {
  const profile = await prisma.whatsAppBusinessProfile.findUnique({ where: { restaurantId } });
  const custom = profile?.inboxQuickRepliesJson;
  if (Array.isArray(custom) && custom.every((x) => typeof x === "string")) {
    return custom as string[];
  }
  return DEFAULT_QUICK_REPLIES;
}

export async function sendInboxMessage(input: {
  restaurantId: string;
  conversationId: string;
  userId?: string;
  kind: "text" | "template" | "media";
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  templateBodyParams?: string[];
  mediaId?: string;
  mediaType?: "image" | "document" | "audio" | "video";
  mediaCaption?: string;
  mediaFilename?: string;
}) {
  const conversation = await assertConversationAccess(input.conversationId, input.restaurantId);
  const connection = await getRestaurantConnection(input.restaurantId);
  if (!connection?.phoneNumberId || !connection.isActive) {
    throw new Error("WhatsApp غير متصل لهذا المطعم");
  }

  const accessToken = await resolveWhatsAppAccessToken();
  if (!accessToken) throw new Error("WhatsApp Access Token is required");

  const withinWindow = isWithinCustomerServiceWindow(conversation.lastCustomerMessageAt);

  if (input.kind === "text") {
    if (!withinWindow) {
      throw new Error("انتهت نافذة 24 ساعة — استخدم قالب Meta معتمد");
    }
    if (!input.text?.trim()) throw new Error("نص الرسالة مطلوب");

    const result = await sendWhatsAppTextMessage({
      phoneNumberId: connection.phoneNumberId,
      accessToken,
      toWaId: conversation.contact.waId,
      text: input.text.trim(),
    });
    if (!result.ok) throw new Error(result.error);

    const msg = await prisma.whatsAppMessage.create({
      data: {
        restaurantId: input.restaurantId,
        conversationId: conversation.id,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        direction: "OUTBOUND",
        messageType: "TEXT",
        bodyText: input.text.trim(),
        providerMessageId: result.messageId,
        status: "SENT",
        sentAt: new Date(),
        sentByUserId: input.userId,
      },
    });

    await touchConversationAfterOutbound(conversation.id, input.text.trim());
    await logWhatsAppInboxAudit({
      restaurantId: input.restaurantId,
      userId: input.userId,
      action: "INBOX_SEND_TEXT",
      entityType: "WhatsAppMessage",
      entityId: msg.id,
    });

    return msg;
  }

  if (input.kind === "template") {
    if (!input.templateName) throw new Error("اسم القالب مطلوب");
    const result = await sendWhatsAppTemplateMessageSimple({
      phoneNumberId: connection.phoneNumberId,
      accessToken,
      toWaId: conversation.contact.waId,
      templateName: input.templateName,
      languageCode: input.templateLanguage || connection.templateLanguage || "ar",
      bodyParameters: input.templateBodyParams,
    });
    if (!result.ok) throw new Error(result.error);

    const msg = await prisma.whatsAppMessage.create({
      data: {
        restaurantId: input.restaurantId,
        conversationId: conversation.id,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        direction: "OUTBOUND",
        messageType: "TEMPLATE",
        templateName: input.templateName,
        bodyText: input.text || `[template:${input.templateName}]`,
        providerMessageId: result.messageId,
        status: "SENT",
        sentAt: new Date(),
        sentByUserId: input.userId,
      },
    });

    await touchConversationAfterOutbound(conversation.id, `قالب: ${input.templateName}`);
    await logWhatsAppInboxAudit({
      restaurantId: input.restaurantId,
      userId: input.userId,
      action: "INBOX_SEND_TEMPLATE",
      entityType: "WhatsAppMessage",
      entityId: msg.id,
      details: { templateName: input.templateName },
    });

    return msg;
  }

  if (input.kind === "media") {
    if (!withinWindow) {
      throw new Error("انتهت نافذة 24 ساعة — لا يمكن إرسال وسائط بدون قالب");
    }
    if (!input.mediaId || !input.mediaType) throw new Error("الوسائط مطلوبة");

    const result = await sendWhatsAppMediaMessage({
      phoneNumberId: connection.phoneNumberId,
      accessToken,
      toWaId: conversation.contact.waId,
      type: input.mediaType,
      mediaId: input.mediaId,
      caption: input.mediaCaption,
      filename: input.mediaFilename,
    });
    if (!result.ok) throw new Error(result.error);

    const msg = await prisma.whatsAppMessage.create({
      data: {
        restaurantId: input.restaurantId,
        conversationId: conversation.id,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        direction: "OUTBOUND",
        messageType: input.mediaType.toUpperCase(),
        bodyText: input.mediaCaption || null,
        mediaCaption: input.mediaCaption,
        providerMessageId: result.messageId,
        status: "SENT",
        sentAt: new Date(),
        sentByUserId: input.userId,
        metadataJson: { mediaId: input.mediaId, mediaType: input.mediaType },
      },
    });

    await touchConversationAfterOutbound(
      conversation.id,
      input.mediaCaption || `[${input.mediaType}]`
    );
    await logWhatsAppInboxAudit({
      restaurantId: input.restaurantId,
      userId: input.userId,
      action: "INBOX_SEND_MEDIA",
      entityType: "WhatsAppMessage",
      entityId: msg.id,
    });

    return msg;
  }

  throw new Error("Unsupported message kind");
}

async function touchConversationAfterOutbound(conversationId: string, preview: string) {
  await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: preview.slice(0, 500),
    },
  });
}

export async function updateConversationMeta(
  restaurantId: string,
  conversationId: string,
  data: {
    status?: string;
    category?: string | null;
    assignedUserId?: string | null;
    assignedByUserId?: string;
    assignmentNote?: string;
  }
) {
  await assertConversationAccess(conversationId, restaurantId);

  const updated = await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.assignedUserId !== undefined ? { assignedUserId: data.assignedUserId } : {}),
    },
  });

  if (data.assignedUserId) {
    await prisma.whatsAppAssignment.create({
      data: {
        restaurantId,
        conversationId,
        assignedUserId: data.assignedUserId,
        assignedByUserId: data.assignedByUserId || null,
        note: data.assignmentNote || null,
      },
    });
  }

  await logWhatsAppInboxAudit({
    restaurantId,
    userId: data.assignedByUserId,
    action: "INBOX_CONVERSATION_UPDATE",
    entityType: "WhatsAppConversation",
    entityId: conversationId,
    details: data as Record<string, unknown>,
  });

  return updated;
}

export async function addInternalNote(input: {
  restaurantId: string;
  conversationId: string;
  authorUserId?: string;
  body: string;
}) {
  await assertConversationAccess(input.conversationId, input.restaurantId);
  const note = await prisma.whatsAppInternalNote.create({
    data: {
      restaurantId: input.restaurantId,
      conversationId: input.conversationId,
      authorUserId: input.authorUserId || null,
      body: input.body.trim(),
    },
  });
  await logWhatsAppInboxAudit({
    restaurantId: input.restaurantId,
    userId: input.authorUserId,
    action: "INBOX_INTERNAL_NOTE",
    entityType: "WhatsAppInternalNote",
    entityId: note.id,
  });
  return note;
}

export async function markConversationRead(restaurantId: string, conversationId: string) {
  await assertConversationAccess(conversationId, restaurantId);
  return prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: { unreadCount: 0 },
  });
}

export async function listApprovedTemplates(restaurantId: string) {
  const rows = await syncTemplatesFromMeta(restaurantId).catch(() => []);
  return rows.filter((t) => t.status === "APPROVED" || t.status === "CONFIGURED");
}

export async function recordAfterVisitOutboundMessage(input: {
  restaurantId: string;
  waId: string;
  phoneNumberId: string;
  wabaId: string | null;
  templateName: string;
  providerMessageId: string;
  previewText?: string;
}) {
  const contact = await prisma.whatsAppContact.upsert({
    where: { restaurantId_waId: { restaurantId: input.restaurantId, waId: input.waId } },
    create: {
      restaurantId: input.restaurantId,
      waId: input.waId,
      wabaId: input.wabaId,
    },
    update: { wabaId: input.wabaId || undefined },
  });

  const conversation = await prisma.whatsAppConversation.upsert({
    where: {
      restaurantId_contactId_phoneNumberId: {
        restaurantId: input.restaurantId,
        contactId: contact.id,
        phoneNumberId: input.phoneNumberId,
      },
    },
    create: {
      restaurantId: input.restaurantId,
      contactId: contact.id,
      wabaId: input.wabaId || "",
      phoneNumberId: input.phoneNumberId,
      lastMessageAt: new Date(),
      lastMessagePreview: input.previewText || `قالب: ${input.templateName}`,
    },
    update: {
      lastMessageAt: new Date(),
      lastMessagePreview: input.previewText || `قالب: ${input.templateName}`,
    },
  });

  await prisma.whatsAppMessage.create({
    data: {
      restaurantId: input.restaurantId,
      conversationId: conversation.id,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      direction: "OUTBOUND",
      messageType: "TEMPLATE",
      templateName: input.templateName,
      bodyText: input.previewText || `after_visit:${input.templateName}`,
      providerMessageId: input.providerMessageId,
      status: "SENT",
      sentAt: new Date(),
      metadataJson: { source: "after_visit_automation" },
    },
  });
}

export function detectReservationIntent(text: string): boolean {
  return /حجز|reserv/i.test(text);
}

export async function proposeReservationDraft(
  restaurantId: string,
  conversationId: string,
  customerName?: string
) {
  const conversation = await assertConversationAccess(conversationId, restaurantId);
  const draft = {
    customerName: customerName || conversation.contact.displayName || "ضيف",
    customerPhone: conversation.contact.waId,
    proposedAt: new Date().toISOString(),
    status: "PENDING_STAFF_APPROVAL",
  };
  await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: {
      category: "RESERVATION",
      reservationDraftJson: draft,
    },
  });
  return draft;
}
