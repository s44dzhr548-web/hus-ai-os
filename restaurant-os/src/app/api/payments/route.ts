import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const paymentsCheck = await assertFeature(restaurantId!, "payments");
  if (paymentsCheck) return paymentsCheck;

  const status = req.nextUrl.searchParams.get("status");

  const payments = await prisma.payment.findMany({
    where: {
      order: { branch: { restaurantId: restaurantId! } },
      ...(status ? { status: status as "PENDING" | "PAID" | "FAILED" | "REFUNDED" } : {}),
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          totalAmount: true,
          table: { select: { number: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(payments);
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const body = await req.json();
  const { id, status } = body;

  const payment = await prisma.payment.findFirst({
    where: { id, order: { branch: { restaurantId: restaurantId! } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "الدفعة غير موجودة" }, { status: 404 });
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: status as "PENDING" | "PAID" | "FAILED" | "REFUNDED",
      processedAt: status === "PAID" ? new Date() : payment.processedAt,
    },
  });

  return NextResponse.json(updated);
}
