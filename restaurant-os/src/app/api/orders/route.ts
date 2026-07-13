import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import { OrderStatus } from "@prisma/client";
import { tableIconEmoji } from "@/lib/table-meta";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const kitchenCheck = await assertFeature(restaurantId!, "kitchenScreen");
  if (kitchenCheck) return kitchenCheck;

  const status = req.nextUrl.searchParams.get("status");
  const branchId = req.nextUrl.searchParams.get("branchId");
  const tableId = req.nextUrl.searchParams.get("tableId");

  const orders = await prisma.order.findMany({
    where: {
      branch: { restaurantId: restaurantId! },
      ...(status ? { status: status as OrderStatus } : {}),
      ...(branchId ? { branchId } : {}),
      ...(tableId ? { tableId } : {}),
    },
    include: {
      items: true,
      table: { select: { number: true, label: true, tableIcon: true } },
      branch: { select: { name: true, nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      totalAmount: Number(o.totalAmount),
      minimumSpendAmount:
        o.minimumSpendAmount != null ? Number(o.minimumSpendAmount) : null,
      tableIconEmoji: tableIconEmoji(o.tableIcon ?? o.table?.tableIcon),
      tableNumber: o.tableNumber ?? o.table?.number,
      tableLabel: o.tableLabel ?? o.table?.label,
    }))
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "استخدم /api/checkout للطلبات مع الدفع" },
    { status: 410 }
  );
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const kitchenCheck = await assertFeature(restaurantId!, "kitchenScreen");
  if (kitchenCheck) return kitchenCheck;

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "معرف الطلب والحالة مطلوبان" }, { status: 400 });
  }

  const existing = await prisma.order.findFirst({
    where: { id, branch: { restaurantId: restaurantId! } },
  });
  if (!existing) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: status as OrderStatus,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
    include: { items: true, table: true },
  });

  return NextResponse.json(order);
}
