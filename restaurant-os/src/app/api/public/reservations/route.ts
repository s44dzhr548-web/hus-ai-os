import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { upsertCustomerProfile } from "@/lib/reception";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    slug,
    customerName,
    customerPhone,
    guestCount = 2,
    date,
    time,
    occasion,
    notes,
    gender,
    preferredArea,
  } = body;

  if (!slug || !customerName?.trim() || !customerPhone?.trim() || !date || !time) {
    return NextResponse.json(
      { error: "جميع الحقول المطلوبة غير مكتملة" },
      { status: 400 }
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const profile = await upsertCustomerProfile(
    restaurant.id,
    customerName.trim(),
    customerPhone.trim()
  );

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      customerProfileId: profile.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      guestCount: parseInt(String(guestCount)) || 2,
      date: new Date(date),
      time: String(time),
      occasion: occasion?.trim() || null,
      notes: notes?.trim() || null,
      preferredArea: preferredArea || null,
      status: "PENDING",
    },
  });

  return NextResponse.json(
    {
      id: reservation.id,
      status: reservation.status,
      message: "تم إرسال طلب الحجز بنجاح",
    },
    { status: 201 }
  );
}
