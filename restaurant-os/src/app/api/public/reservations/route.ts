import { NextRequest, NextResponse } from "next/server";
import {
  createPublicReservation,
} from "@/lib/reservation-booking-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idempotencyKey =
      req.headers.get("x-idempotency-key")?.trim() ||
      String(body.idempotencyKey || body.requestId || "").trim() ||
      null;

    const result = await createPublicReservation({
      slug: String(body.slug || ""),
      customerName: String(body.customerName || body.name || ""),
      customerPhone: String(body.customerPhone || body.phone || ""),
      date: String(body.date || ""),
      time: String(body.time || ""),
      guestCount: Number(body.guestCount ?? body.guests ?? 2),
      sessionType: body.sessionType ? String(body.sessionType) : null,
      occasion: body.occasion ? String(body.occasion) : null,
      notes: body.notes ? String(body.notes) : null,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        ok: true,
        id: result.reservation.id,
        status: result.reservation.status,
        reservationNumber: result.reservation.reservationNumber,
        publicToken: result.reservation.publicAccessToken,
        publicUrl: result.publicUrl,
        reservation: result.view,
        duplicate: result.duplicate,
        message: "تم استلام طلب الحجز",
      },
      { status: result.duplicate ? 200 : 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل إرسال الحجز";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
