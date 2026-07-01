import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: { select: { status: true, method: true, amount: true } },
      table: { select: { number: true, label: true } },
      branch: {
        select: {
          name: true,
          nameAr: true,
          restaurant: { select: { name: true, nameAr: true, logoUrl: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    subtotal: Number(order.subtotal),
    tipAmount: Number(order.tipAmount),
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      name: i.nameAr || i.name,
      quantity: i.quantity,
      totalPrice: Number(i.totalPrice),
    })),
    payment: order.payments[0]
      ? {
          status: order.payments[0].status,
          method: order.payments[0].method,
          amount: Number(order.payments[0].amount),
        }
      : null,
    table: order.table
      ? { id: order.tableId, number: order.table.number, label: order.table.label }
      : null,
    restaurant: {
      name: order.branch.restaurant.nameAr || order.branch.restaurant.name,
      logoUrl: order.branch.restaurant.logoUrl,
    },
    branch: order.branch.nameAr || order.branch.name,
  });
}
