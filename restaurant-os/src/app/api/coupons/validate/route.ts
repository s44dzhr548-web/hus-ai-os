import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, restaurantId, subtotal } = body;

  if (!code || !restaurantId) {
    return NextResponse.json({ error: "كود الكوبون مطلوب" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      restaurantId,
      code: code.toUpperCase(),
      isActive: true,
    },
  });

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "كوبون غير صالح" });
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "كوبون منتهي" });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "كوبون مستنفد" });
  }

  if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
    return NextResponse.json({
      valid: false,
      error: `الحد الأدنى ${Number(coupon.minOrder)} ر.س`,
    });
  }

  const discount =
    coupon.type === "PERCENTAGE"
      ? subtotal * (Number(coupon.value) / 100)
      : Number(coupon.value);

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discount,
    type: coupon.type,
    value: Number(coupon.value),
  });
}
