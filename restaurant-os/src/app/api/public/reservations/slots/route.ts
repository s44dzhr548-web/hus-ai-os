import { NextRequest, NextResponse } from "next/server";
import { getPublicReservationSlots } from "@/lib/reservation-booking-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const date = req.nextUrl.searchParams.get("date");
  if (!slug || !date) {
    return NextResponse.json({ error: "slug و date مطلوبان" }, { status: 400 });
  }
  try {
    const slots = await getPublicReservationSlots(slug, date);
    return NextResponse.json({ slots });
  } catch (e) {
    const message = e instanceof Error ? e.message : "تعذر تحميل الأوقات";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
