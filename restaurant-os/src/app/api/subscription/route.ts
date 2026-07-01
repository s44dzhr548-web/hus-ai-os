import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import {
  getRestaurantUsage,
  getEffectiveLimits,
  planList,
  serializeLimits,
  remainingLimits,
  normalizePlan,
  TRIAL_DAYS,
} from "@/lib/subscription-limits";
import { subscriptionExpiryInfo } from "@/lib/subscription-display";

export const dynamic = "force-dynamic";

function renewalNotice(
  status: SubscriptionStatus,
  daysRemaining: number | null,
  isExpired: boolean
): string | null {
  if (isExpired || status === "EXPIRED") {
    return "انتهى اشتراكك. جدّد الآن للاستمرار في استخدام الميزات المميزة.";
  }
  if (status === "PAST_DUE") {
    return "فشل التجديد التلقائي. يرجى تحديث وسيلة الدفع.";
  }
  if (status === "TRIAL" && daysRemaining != null && daysRemaining <= 3) {
    return `تنتهي تجربتك خلال ${daysRemaining} يوم. اختر خطة للمتابعة.`;
  }
  if (daysRemaining != null && daysRemaining <= 7 && daysRemaining > 0) {
    return `ينتهي اشتراكك خلال ${daysRemaining} يوم. جدّد لتجنب انقطاع الخدمة.`;
  }
  return null;
}

export async function GET() {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const [subscription, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { restaurantId: restaurantId! } }),
    getRestaurantUsage(restaurantId!),
  ]);

  const limits = getEffectiveLimits(usage.plan, usage.limitOverrides);
  const remaining = remainingLimits(usage, limits);
  const expiry = subscriptionExpiryInfo(subscription?.endDate);

  return NextResponse.json({
    subscription,
    usage: {
      branches: usage.branches,
      tables: usage.tables,
      categories: usage.categories,
      items: usage.items,
      storageMb: usage.storageMb,
    },
    limits: serializeLimits(limits),
    remaining,
    daysRemaining: expiry.daysRemaining,
    isExpired: expiry.isExpired,
    renewalNotice: renewalNotice(
      subscription?.status ?? "TRIAL",
      expiry.daysRemaining,
      expiry.isExpired
    ),
    trialDays: TRIAL_DAYS,
    plans: planList().map((p) => ({
      id: p.id,
      name: p.label,
      label: p.label,
      price: p.price,
      features: p.features,
      limits: serializeLimits(getEffectiveLimits(p.id)),
    })),
  });
}

export async function PUT(req: NextRequest) {
  const { session, restaurantId, error } = await requireRestaurant();
  if (error) return error;

  if (!session?.user?.isPlatformAdmin) {
    return NextResponse.json(
      {
        error: "استخدم صفحة الفوترة للترقية أو تواصل مع الدعم.",
        code: "PLAN_CHANGE_USE_BILLING",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { plan } = body;
  const validPlans = ["FREE", "STARTER", "PRO", "BUSINESS", "ENTERPRISE", "BASIC"];

  if (!plan || !validPlans.includes(plan)) {
    return NextResponse.json({ error: "خطة غير صالحة" }, { status: 400 });
  }

  const normalized = normalizePlan(plan);
  const endDate =
    normalized === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId: restaurantId! },
    update: {
      plan: normalized,
      status: "ACTIVE" as SubscriptionStatus,
      endDate,
    },
    create: {
      restaurantId: restaurantId!,
      plan: normalized,
      status: "ACTIVE",
      endDate,
    },
  });

  return NextResponse.json(subscription);
}
