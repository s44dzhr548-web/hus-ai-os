import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const orderNumber = req.nextUrl.searchParams.get("orderNumber");

  if (!slug) {
    return NextResponse.json({ error: "المطعم مطلوب" }, { status: 400 });
  }

  if (!orderNumber) {
    return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
  }

  const num = parseInt(orderNumber, 10);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "رقم الطلب غير صالح" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!restaurant?.isActive) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: num,
      branch: { restaurantId: restaurant.id },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
  });
}
