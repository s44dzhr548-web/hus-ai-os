import { NextRequest, NextResponse } from "next/server";
import { requireWhatsAppInboxAccess } from "@/lib/marketing/auth";
import {
  assertConversationAccess,
  isWithinCustomerServiceWindow,
  markConversationRead,
  updateConversationMeta,
} from "@/lib/whatsapp-inbox/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { error, restaurantId } = await requireWhatsAppInboxAccess();
  if (error) return error;

  const { id } = await ctx.params;
  const conversation = await assertConversationAccess(id, restaurantId!);
  await markConversationRead(restaurantId!, id);

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      status: conversation.status,
      category: conversation.category,
      assignedUserId: conversation.assignedUserId,
      wabaId: conversation.wabaId,
      phoneNumberId: conversation.phoneNumberId,
      withinServiceWindow: isWithinCustomerServiceWindow(conversation.lastCustomerMessageAt),
      reservationDraft: conversation.reservationDraftJson,
      contact: conversation.contact,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        messageType: m.messageType,
        bodyText: m.bodyText,
        mediaUrl: m.mediaUrl,
        mediaMimeType: m.mediaMimeType,
        templateName: m.templateName,
        status: m.status,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        failedReason: m.failedReason,
        createdAt: m.createdAt,
      })),
      notes: conversation.internalNotes,
      assignments: conversation.assignments,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error, restaurantId, session, canSend } = await requireWhatsAppInboxAccess();
  if (error) return error;
  if (!canSend) {
    return NextResponse.json({ error: "ليس لديك صلاحية التعديل" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  const updated = await updateConversationMeta(restaurantId!, id, {
    status: body.status ? String(body.status) : undefined,
    category: body.category !== undefined ? (body.category ? String(body.category) : null) : undefined,
    assignedUserId:
      body.assignedUserId !== undefined ?
        body.assignedUserId ? String(body.assignedUserId)
        : null
      : undefined,
    assignedByUserId: session?.user?.id,
    assignmentNote: body.assignmentNote ? String(body.assignmentNote) : undefined,
  });

  return NextResponse.json({ conversation: updated });
}
