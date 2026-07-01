import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { PLAN_LABELS } from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const { invoiceNumber } = await params;

  const invoice = await prisma.subscriptionBillingPayment.findFirst({
    where: { invoiceNumber, restaurantId: restaurantId! },
    include: {
      restaurant: {
        select: { name: true, nameAr: true, email: true, taxNumber: true },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
  }

  return NextResponse.json({
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      plan: invoice.plan,
      planLabel: PLAN_LABELS[invoice.plan] || invoice.plan,
      type: invoice.type,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      processedAt: invoice.processedAt,
      createdAt: invoice.createdAt,
      moyasarPaymentId: invoice.moyasarPaymentId,
    },
    restaurant: invoice.restaurant,
  });
}
