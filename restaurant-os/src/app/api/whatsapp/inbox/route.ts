import { NextRequest, NextResponse } from "next/server";
import { requireWhatsAppInboxAccess } from "@/lib/marketing/auth";
import {
  getQuickReplies,
  getRestaurantConnection,
  isWithinCustomerServiceWindow,
  listApprovedTemplates,
  listInboxConversations,
} from "@/lib/whatsapp-inbox/service";
import { whatsAppWebhookUrl } from "@/lib/marketing/whatsapp-business";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId, canSend } = await requireWhatsAppInboxAccess();
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;

  const [conversations, connection, templates, quickReplies, creds] = await Promise.all([
    listInboxConversations(restaurantId!, { q, status }),
    getRestaurantConnection(restaurantId!),
    listApprovedTemplates(restaurantId!),
    getQuickReplies(restaurantId!),
    resolveMetaCredentials(),
  ]);

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      status: c.status,
      category: c.category,
      assignedUserId: c.assignedUserId,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      unreadCount: c.unreadCount,
      lastCustomerMessageAt: c.lastCustomerMessageAt,
      withinServiceWindow: isWithinCustomerServiceWindow(c.lastCustomerMessageAt),
      contact: {
        id: c.contact.id,
        waId: c.contact.waId,
        displayName: c.contact.displayName || c.contact.waId,
      },
      wabaId: c.wabaId,
      phoneNumberId: c.phoneNumberId,
      reservationDraft: c.reservationDraftJson,
    })),
    connection: connection
      ? {
          wabaId: connection.wabaId,
          phoneNumberId: connection.phoneNumberId,
          connectionStatus: connection.connectionStatus,
          businessPhone: connection.businessPhone,
        }
      : null,
    templates,
    quickReplies,
    webhookUrl: whatsAppWebhookUrl(),
    webhookConfigured: Boolean(creds.webhookVerifyToken),
    permissions: { canSend },
  });
}
