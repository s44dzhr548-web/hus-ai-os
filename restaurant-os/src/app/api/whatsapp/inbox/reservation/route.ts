import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireWhatsAppInboxAccess } from "@/lib/marketing/auth";
import { assertConversationAccess } from "@/lib/whatsapp-inbox/service";
import { upsertCustomerProfile } from "@/lib/reception";
import { logReservationAudit } from "@/lib/reservation-audit";

export const dynamic = "force-dynamic";

/** Create reservation from inbox draft after staff approval — does not auto-create without approval. */
export async function POST(req: NextRequest) {
  const { error, restaurantId, session, canSend } = await requireWhatsAppInboxAccess();
  if (error) return error;
  if (!canSend) {
    return NextResponse.json({ error: "صلاحية مطلوبة" }, { status: 403 });
  }

  const body = await req.json();
  const conversationId = String(body.conversationId || "");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId مطلوب" }, { status: 400 });
  }

  const conversation = await assertConversationAccess(conversationId, restaurantId!);
  const draft = (conversation.reservationDraftJson || {}) as Record<string, string>;
  const guestCount = Number(body.guestCount || draft.guestCount || 2);
  const reservationDate = String(body.reservationDate || draft.reservationDate || "");
  const reservationTime = String(body.reservationTime || draft.reservationTime || "");
  const customerName = String(body.customerName || draft.customerName || conversation.contact.displayName || "ضيف");
  const customerPhone = conversation.contact.waId;

  if (!reservationDate || !reservationTime) {
    return NextResponse.json(
      { error: "أدخل تاريخ ووقت الحجز قبل التأكيد" },
      { status: 400 }
    );
  }

  const branch = await prisma.branch.findFirst({
    where: { restaurantId: restaurantId!, isActive: true },
    select: { id: true },
  });
  if (!branch) {
    return NextResponse.json({ error: "لا يوجد فرع نشط" }, { status: 400 });
  }

  const profile = await upsertCustomerProfile(
    restaurantId!,
    customerName,
    customerPhone
  );

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurantId!,
      branchId: branch.id,
      customerProfileId: profile.id,
      customerName,
      customerPhone,
      guestCount,
      date: new Date(`${reservationDate}T00:00:00`),
      time: reservationTime,
      status: "CONFIRMED",
      source: "whatsapp_inbox",
      notes: "Created from WhatsApp Inbox (staff approved)",
      confirmedAt: new Date(),
      confirmedByUserId: session?.user?.id || null,
    },
  });

  await logReservationAudit(
    restaurantId!,
    reservation.id,
    "CREATE_FROM_WHATSAPP_INBOX",
    { userId: session?.user?.id, userName: session?.user?.name || undefined },
    null,
    { conversationId }
  );

  await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: {
      reservationDraftJson: {
        ...draft,
        status: "CONFIRMED",
        reservationId: reservation.id,
      },
    },
  });

  return NextResponse.json({ reservation: { id: reservation.id, status: reservation.status } });
}
