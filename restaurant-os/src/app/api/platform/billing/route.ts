import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { computeBillingStats } from "@/lib/billing/subscription-billing";
import { getBillingGatewayStatus } from "@/lib/billing/gateway";
import { normalizePlan, PLAN_LABELS, planPrice } from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const [stats, recentPayments, planBreakdown, gateway] = await Promise.all([
    computeBillingStats(),
    prisma.subscriptionBillingPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        restaurant: { select: { id: true, name: true, nameAr: true, slug: true } },
      },
    }),
    prisma.subscription.groupBy({
      by: ["plan", "status"],
      _count: true,
    }),
    Promise.resolve(getBillingGatewayStatus()),
  ]);

  return NextResponse.json({
    stats,
    gateway,
    planBreakdown: planBreakdown.map((p) => ({
      plan: normalizePlan(p.plan),
      label: PLAN_LABELS[normalizePlan(p.plan)] || p.plan,
      price: planPrice(normalizePlan(p.plan)),
      status: p.status,
      count: p._count,
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      restaurant: p.restaurant.nameAr || p.restaurant.name,
      restaurantId: p.restaurantId,
      plan: normalizePlan(p.plan),
      amount: Number(p.amount),
      status: p.status,
      paymentMethod: p.paymentMethod,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
    })),
  });
}
