import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { logPlatformAudit } from "@/lib/platform-audit";
import {
  PLAN_LIMITS,
  PLAN_ORDER,
  planList,
  serializeLimits,
  getEffectiveLimits,
} from "@/lib/subscription-limits";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const restaurants = await prisma.restaurant.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      subscription: true,
      _count: { select: { branches: true, menuCategories: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tableCounts = await prisma.diningTable.groupBy({
    by: ["branchId"],
    _count: true,
  });
  const branches = await prisma.branch.findMany({
    select: { id: true, restaurantId: true },
  });
  const branchToRestaurant = new Map(branches.map((b) => [b.id, b.restaurantId]));
  const tablesByRestaurant = new Map<string, number>();
  for (const row of tableCounts) {
    const rid = branchToRestaurant.get(row.branchId);
    if (rid) tablesByRestaurant.set(rid, (tablesByRestaurant.get(rid) || 0) + row._count);
  }

  return NextResponse.json({
    plans: planList().map((p) => ({
      id: p.id,
      label: p.label,
      price: p.price,
      features: p.features,
      limits: serializeLimits(getEffectiveLimits(p.id)),
    })),
    restaurants: restaurants.map((r) => {
      const sub = r.subscription;
      const plan = sub?.plan ?? "FREE";
      const limits = getEffectiveLimits(
        plan,
        (sub?.limitOverrides as Record<string, unknown>) || null
      );
      return {
        id: r.id,
        name: r.nameAr || r.name,
        slug: r.slug,
        isActive: r.isActive,
        owner: r.owner,
        subscription: sub
          ? {
              id: sub.id,
              plan: sub.plan,
              status: sub.status,
              startDate: sub.startDate,
              endDate: sub.endDate,
              limitOverrides: sub.limitOverrides,
            }
          : null,
        usage: {
          branches: r._count.branches,
          categories: r._count.menuCategories,
          tables: tablesByRestaurant.get(r.id) || 0,
        },
        limits: serializeLimits(limits),
      };
    }),
    planOrder: PLAN_ORDER,
  });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    restaurantId,
    action,
    plan,
    extendDays,
    limitOverrides,
    status,
  } = body as {
    restaurantId: string;
    action?: "upgrade" | "downgrade" | "suspend" | "extend" | "override" | "activate";
    plan?: SubscriptionPlan;
    extendDays?: number;
    limitOverrides?: Record<string, unknown>;
    status?: SubscriptionStatus;
  };

  if (!restaurantId) {
    return NextResponse.json({ error: "معرف المطعم مطلوب" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { subscription: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const current = restaurant.subscription;
  const update: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    endDate?: Date | null;
    startDate?: Date;
    limitOverrides?: object;
  } = {};

  let auditAction = "PLATFORM_SUBSCRIPTION_UPDATE";

  if (action === "upgrade" || action === "downgrade") {
    if (!plan || !PLAN_ORDER.includes(plan)) {
      return NextResponse.json({ error: "خطة غير صالحة" }, { status: 400 });
    }
    update.plan = plan;
    update.status = "ACTIVE";
    if (!current?.endDate || current.endDate < new Date()) {
      update.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    auditAction =
      action === "upgrade" ? "PLATFORM_SUBSCRIPTION_UPGRADE" : "PLATFORM_SUBSCRIPTION_DOWNGRADE";
  } else if (action === "suspend") {
    update.status = "SUSPENDED";
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: false },
    });
    auditAction = "PLATFORM_SUBSCRIPTION_SUSPEND";
  } else if (action === "activate") {
    update.status = "ACTIVE";
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: true },
    });
    auditAction = "PLATFORM_SUBSCRIPTION_ACTIVATE";
  } else if (action === "extend") {
    const days = extendDays || 30;
    const base = current?.endDate && current.endDate > new Date()
      ? current.endDate
      : new Date();
    update.endDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    update.status = "ACTIVE";
    auditAction = "PLATFORM_SUBSCRIPTION_EXTEND";
  } else if (action === "override") {
    update.limitOverrides = limitOverrides ?? {};
    auditAction = "PLATFORM_SUBSCRIPTION_OVERRIDE";
  }

  if (status && !action) {
    update.status = status;
  }
  if (plan && !action) {
    update.plan = plan;
  }

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId },
    update,
    create: {
      restaurantId,
      plan: plan || "FREE",
      status: status || "ACTIVE",
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...update,
    },
  });

  await logPlatformAudit({
    userId: session!.user.id,
    restaurantId,
    action: auditAction,
    entity: "Subscription",
    entityId: subscription.id,
    metadata: { action, plan, extendDays, limitOverrides, status },
  });

  const limits = getEffectiveLimits(
    subscription.plan,
    (subscription.limitOverrides as Record<string, unknown>) || null
  );

  return NextResponse.json({
    subscription,
    limits: serializeLimits(limits),
    planLabel: PLAN_LIMITS[subscription.plan].label,
  });
}
