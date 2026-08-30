import { NextRequest, NextResponse } from "next/server";
import {
  cancelPublicReservationByToken,
  getPublicReservationByToken,
  updatePublicReservationByToken,
} from "@/lib/reservation-booking-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const view = await getPublicReservationByToken(token);
  if (!view) {
    return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ reservation: view });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const action = String(body.action || "update");

  try {
    if (action === "cancel") {
      const view = await cancelPublicReservationByToken(token);
      return NextResponse.json({ ok: true, reservation: view });
    }

    const view = await updatePublicReservationByToken(token, {
      date: body.date ? String(body.date) : undefined,
      time: body.time ? String(body.time) : undefined,
      guestCount: body.guestCount != null ? Number(body.guestCount) : undefined,
      notes: body.notes !== undefined ? String(body.notes || "") : undefined,
      occasion: body.occasion !== undefined ? String(body.occasion || "") : undefined,
      sessionType:
        body.sessionType !== undefined ? String(body.sessionType || "") : undefined,
    });
    return NextResponse.json({ ok: true, reservation: view });
  } catch (e) {
    const message = e instanceof Error ? e.message : "تعذر تحديث الحجز";
    const status = message.includes("تم تأكيد الحجز") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
