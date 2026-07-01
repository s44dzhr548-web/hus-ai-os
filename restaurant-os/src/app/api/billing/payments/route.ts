import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const payments = await prisma.subscriptionBillingPayment.findMany({
    where: { restaurantId: restaurantId! },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      invoiceNumber: true,
      plan: true,
      type: true,
      amount: true,
      currency: true,
      status: true,
      paymentMethod: true,
      periodStart: true,
      periodEnd: true,
      processedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
  });
}
