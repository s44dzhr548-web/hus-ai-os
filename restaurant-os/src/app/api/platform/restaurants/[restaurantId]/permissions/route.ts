import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getEffectiveLimits,
  getRestaurantUsage,
  serializeLimits,
  PLAN_LIMITS,
  type LimitOverrides,
} from "@/lib/subscription-limits";
import {
  FEATURE_FIELDS,
  LIMIT_FIELDS,
  applyPermissionValues,
  buildOverridesFromForm,
  diffPermissionOverrides,
  resetPermissionOverrides,
  planLabel,
} from "@/lib/permission-fields";
import {
  getPermissionAuditLog,
  logPermissionChanges,
} from "@/lib/permission-audit";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ restaurantId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      subscription: true,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const plan = restaurant.subscription?.plan ?? "FREE";
  const overrides =
    (restaurant.subscription?.limitOverrides as LimitOverrides) || null;
  const usage = await getRestaurantUsage(restaurantId);
  const planDefaults = getEffectiveLimits(plan, null);
  const effective = getEffectiveLimits(plan, overrides);
  const auditLog = await getPermissionAuditLog(restaurantId);

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.nameAr || restaurant.name,
      slug: restaurant.slug,
      isActive: restaurant.isActive,
      owner: restaurant.owner,
    },
    subscription: restaurant.subscription
      ? {
          id: restaurant.subscription.id,
          plan: restaurant.subscription.plan,
          status: restaurant.subscription.status,
          startDate: restaurant.subscription.startDate,
          endDate: restaurant.subscription.endDate,
        }
      : null,
    planLabel: planLabel(plan),
    planDefaults: serializeLimits(planDefaults),
    overrides,
    effective: serializeLimits(effective),
    usage: {
      branches: usage.branches,
      tables: usage.tables,
      categories: usage.categories,
      items: usage.items,
      storageMb: usage.storageMb,
    },
    fields: {
      limits: LIMIT_FIELDS,
      features: FEATURE_FIELDS,
    },
    auditLog,
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;
  const body = await req.json();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { subscription: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const plan = restaurant.subscription?.plan ?? "FREE";
  const currentOverrides =
    (restaurant.subscription?.limitOverrides as LimitOverrides) || null;

  let overrides: LimitOverrides | null;
  let changes;

  if (body.limits && body.features) {
    overrides = buildOverridesFromForm(plan, body.limits, body.features);
    changes = diffPermissionOverrides(plan, currentOverrides, overrides);
  } else {
    const patch = (body.overrides || body) as Partial<LimitOverrides>;
    ({ overrides, changes } = applyPermissionValues(
      plan,
      currentOverrides,
      patch
    ));
  }

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId },
    update: {
      limitOverrides:
        overrides === null ? Prisma.JsonNull : (overrides as Prisma.InputJsonValue),
    },
    create: {
      restaurantId,
      plan: "FREE",
      status: "TRIAL",
      limitOverrides:
        overrides === null ? Prisma.JsonNull : (overrides as Prisma.InputJsonValue),
    },
  });

  await logPermissionChanges({
    userId: session!.user.id,
    restaurantId,
    subscriptionId: subscription.id,
    changes,
  });

  const effective = getEffectiveLimits(
    subscription.plan,
    (subscription.limitOverrides as LimitOverrides) || null
  );

  return NextResponse.json({
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      limitOverrides: subscription.limitOverrides,
    },
    effective: serializeLimits(effective),
    changes,
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;
  const body = await req.json();

  if (body.action !== "reset") {
    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { subscription: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const plan = restaurant.subscription?.plan ?? "FREE";
  const currentOverrides =
    (restaurant.subscription?.limitOverrides as LimitOverrides) || null;
  const { overrides, changes } = resetPermissionOverrides(plan, currentOverrides);

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId },
    update: { limitOverrides: Prisma.JsonNull },
    create: {
      restaurantId,
      plan: "FREE",
      status: "TRIAL",
    },
  });

  await logPermissionChanges({
    userId: session!.user.id,
    restaurantId,
    subscriptionId: subscription.id,
    changes,
    reset: true,
  });

  const effective = getEffectiveLimits(subscription.plan, overrides);

  return NextResponse.json({
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      limitOverrides: null,
    },
    effective: serializeLimits(effective),
    planDefaults: serializeLimits(getEffectiveLimits(plan, null)),
    planLabel: PLAN_LIMITS[plan].label,
    changes,
  });
}
