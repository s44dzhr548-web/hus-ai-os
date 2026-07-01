import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { SubscriptionPlan } from "@prisma/client";
import {
  amountInHalalas,
  appBaseUrl,
  createPendingBillingPayment,
  getPlatformMoyasarKeys,
  isMockBilling,
  logBillingEvent,
  resolveBillingType,
} from "@/lib/billing/subscription-billing";
import {
  assertLiveBillingReady,
  getBillingGatewayStatus,
} from "@/lib/billing/gateway";
import {
  CHECKOUT_PLANS,
  normalizePlan,
  planPrice,
} from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { plan } = body as { plan: SubscriptionPlan };

  if (!plan || !CHECKOUT_PLANS.includes(normalizePlan(plan))) {
    return NextResponse.json(
      { error: "خطة غير متاحة للشراء. Enterprise يتطلب التواصل مع الدعم." },
      { status: 400 }
    );
  }

  const targetPlan = normalizePlan(plan);
  const price = planPrice(targetPlan);
  if (price <= 0) {
    return NextResponse.json({ error: "خطة غير قابلة للدفع" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId: restaurantId! },
  });

  if (!subscription) {
    return NextResponse.json({ error: "لا يوجد اشتراك" }, { status: 404 });
  }

  const billingType = resolveBillingType(subscription.plan, targetPlan);
  const gateway = getBillingGatewayStatus();
  const liveCheck = assertLiveBillingReady();

  if (process.env.NODE_ENV === "production" && isMockBilling()) {
    const allowMock = process.env.MOYASAR_BILLING_MODE?.toLowerCase() === "mock";
    if (!allowMock) {
      return NextResponse.json(
        {
          error: "بوابة الدفع غير مُفعّلة. أضف مفاتيح Moyasar في Vercel.",
          missingKeys: gateway.missingKeys,
          code: "BILLING_GATEWAY_NOT_READY",
        },
        { status: 503 }
      );
    }
  }

  const pending = await createPendingBillingPayment({
    restaurantId: restaurantId!,
    subscriptionId: subscription.id,
    plan: targetPlan,
    type: billingType,
    amount: price,
  });

  const { publishableKey } = getPlatformMoyasarKeys();
  const callbackUrl = `${appBaseUrl()}/dashboard/billing/success?billingId=${pending.id}`;

  await logBillingEvent({
    restaurantId: restaurantId!,
    userId: session!.user.id,
    action: "BILLING_CHECKOUT_STARTED",
    entityId: pending.id,
    metadata: { plan: targetPlan, amount: price, type: billingType },
  });

  return NextResponse.json({
    billingId: pending.id,
    invoiceNumber: pending.invoiceNumber,
    plan: targetPlan,
    amount: price,
    amountHalalas: amountInHalalas(price),
    currency: "SAR",
    publishableKey,
    callbackUrl,
    mockMode: isMockBilling(),
    liveMode: gateway.mode === "live",
    gatewayReady: gateway.ready,
    supportedMethods: gateway.supportedMethods,
    description: `Menu OS ${targetPlan} — ${pending.invoiceNumber}`,
    metadata: {
      billingPaymentId: pending.id,
      restaurantId: restaurantId!,
      plan: targetPlan,
    },
  });
}
