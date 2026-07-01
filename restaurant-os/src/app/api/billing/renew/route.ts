import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import {
  createPendingBillingPayment,
  logBillingEvent,
} from "@/lib/billing/subscription-billing";
import { normalizePlan, planPrice } from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

export async function POST() {
  const { session, restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId: restaurantId! },
  });

  if (!subscription) {
    return NextResponse.json({ error: "لا يوجد اشتراك" }, { status: 404 });
  }

  const plan = normalizePlan(subscription.plan);
  const price = planPrice(plan);

  if (price <= 0) {
    return NextResponse.json(
      { error: "التجديد غير متاح لهذه الخطة. تواصل مع الدعم." },
      { status: 400 }
    );
  }

  const pending = await createPendingBillingPayment({
    restaurantId: restaurantId!,
    subscriptionId: subscription.id,
    plan,
    type: "RENEWAL",
    amount: price,
  });

  return NextResponse.json({
    billingId: pending.id,
    invoiceNumber: pending.invoiceNumber,
    checkoutUrl: `/dashboard/billing/checkout?plan=${plan}`,
  });
}
