import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/subscription-limits";
import { logPlatformAudit } from "@/lib/platform-audit";
import { createOwnerRestaurant, verifyOwnerCredentials } from "@/lib/owner-setup";
import { buildRestaurantLinks } from "@/lib/restaurant-links";
import { subscriptionExpiryInfo } from "@/lib/subscription-display";
import { computeBillingStats } from "@/lib/billing/subscription-billing";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "TRIAL",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
  "PAST_DUE",
];

export async function GET() {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const [restaurants, users, ordersToday, subscriptions, billingStats] = await Promise.all([
    prisma.restaurant.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        subscription: true,
        _count: { select: { branches: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.order.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.subscription.groupBy({
      by: ["plan", "status"],
      _count: true,
    }),
    computeBillingStats(),
  ]);

  const mrr = billingStats.mrr;

  return NextResponse.json({
    stats: {
      restaurants: restaurants.length,
      users,
      ordersToday,
      mrr,
      arr: billingStats.arr,
      monthlyRevenue: billingStats.monthlyRevenue,
      totalRevenue: billingStats.totalRevenue,
      activeSubscriptions: billingStats.activeSubscriptions,
      trialSubscriptions: billingStats.trialAccounts,
      expiredSubscriptions: billingStats.expiredAccounts,
      pastDueSubscriptions: billingStats.pastDueAccounts,
      totalCustomers: billingStats.totalCustomers,
    },
    subscriptions,
    plans: Object.keys(PLAN_LIMITS).map((id) => ({
      id,
      label: PLAN_LIMITS[id as SubscriptionPlan].label,
      price: PLAN_LIMITS[id as SubscriptionPlan].price,
    })),
    restaurants: restaurants.map((r) => {
      const sub = r.subscription;
      const expiry = subscriptionExpiryInfo(sub?.endDate);
      return {
        id: r.id,
        name: r.nameAr || r.name,
        slug: r.slug,
        logoUrl: r.logoUrl,
        isActive: r.isActive,
        owner: r.owner,
        plan: sub?.plan ?? "FREE",
        status: sub?.status ?? "TRIAL",
        startDate: sub?.startDate ?? r.createdAt,
        endDate: sub?.endDate ?? null,
        daysRemaining: expiry.daysRemaining,
        isExpired: expiry.isExpired,
        expiryLabel: expiry.label,
        branches: r._count.branches,
        createdAt: r.createdAt,
      };
    }),
    adminId: session!.user.id,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    restaurantName,
    restaurantNameAr,
    ownerName,
    ownerEmail,
    phone,
    plan = "FREE",
    trialDays = 14,
    password,
    testLogin = false,
  } = body;

  if (!restaurantName || !ownerName || !ownerEmail) {
    return NextResponse.json(
      { error: "اسم المطعم واسم المالك والبريد مطلوبة" },
      { status: 400 }
    );
  }

  const email = ownerEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "البريد مستخدم بالفعل" }, { status: 409 });
  }

  try {
    const result = await createOwnerRestaurant({
      restaurantName,
      restaurantNameAr,
      ownerName,
      ownerEmail: email,
      phone,
      plan,
      trialDays,
      password,
    });

    await logPlatformAudit({
      userId: session!.user.id,
      restaurantId: result.restaurant.id,
      action: "PLATFORM_CREATE_RESTAURANT",
      entity: "Restaurant",
      entityId: result.restaurant.id,
      metadata: { plan, trialDays, ownerEmail: email, loginVerified: result.loginVerified },
    });

    const links = buildRestaurantLinks({
      slug: result.restaurant.slug,
      tableId: result.table.id,
      tableCode: result.table.tableCode,
      qrCode: result.table.qrCode,
      branchId: result.branch.id,
    });

    const appBase = links.dashboardUrl.replace(/\/dashboard.*$/, "");

    const response: Record<string, unknown> = {
      restaurantId: result.restaurant.id,
      slug: result.restaurant.slug,
      branchId: result.branch.id,
      tableId: result.table.id,
      ownerId: result.user.id,
      ownerEmail: email,
      tempPassword: result.plainPassword,
      role: "OWNER",
      loginVerified: result.loginVerified,
      dashboardUrl: links.dashboardUrl,
      onboardingUrl: `${appBase}/dashboard/onboarding`,
      links,
    };

    if (!result.loginVerified) {
      response.loginError = result.loginError || "verification_failed";
    }

    if (testLogin) {
      const check = await verifyOwnerCredentials(email, result.plainPassword);
      response.testLogin = check;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل الإنشاء";
    if (message === "PASSWORD_TOO_SHORT") {
      return NextResponse.json(
        { error: "كلمة المرور 8 أحرف على الأقل" },
        { status: 400 }
      );
    }
    if (message === "PASSWORD_WEAK") {
      return NextResponse.json(
        { error: "كلمة المرور ضعيفة — استخدم حروفاً كبيرة وصغيرة ورقماً ورمزاً" },
        { status: 400 }
      );
    }
    console.error("[platform POST]", err);
    return NextResponse.json({ error: "فشل إنشاء المطعم" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    restaurantId,
    action,
    status,
    plan,
    trialDays,
    endDate,
  } = body as {
    restaurantId: string;
    action?:
      | "activate"
      | "disable"
      | "set_plan"
      | "extend_trial"
      | "set_status";
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    trialDays?: number;
    endDate?: string;
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

  const subUpdate: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    endDate?: Date | null;
    startDate?: Date;
  } = {};

  const restaurantUpdate: { isActive?: boolean } = {};
  let auditAction = "PLATFORM_COMMERCIAL_UPDATE";
  const metadata: Record<string, unknown> = { action };

  if (action === "activate") {
    subUpdate.status = "ACTIVE";
    subUpdate.startDate = restaurant.subscription?.startDate ?? new Date();
    if (!restaurant.subscription?.endDate || restaurant.subscription.endDate < new Date()) {
      subUpdate.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    restaurantUpdate.isActive = true;
    auditAction = "PLATFORM_SUBSCRIPTION_ACTIVATE";
  } else if (action === "disable") {
    subUpdate.status = "SUSPENDED";
    restaurantUpdate.isActive = false;
    auditAction = "PLATFORM_RESTAURANT_DISABLE";
  } else if (action === "set_plan") {
    if (!plan || !Object.keys(PLAN_LIMITS).includes(plan)) {
      return NextResponse.json({ error: "خطة غير صالحة" }, { status: 400 });
    }
    subUpdate.plan = plan;
    if (plan === "FREE") {
      subUpdate.endDate = null;
    } else if (
      !restaurant.subscription?.endDate ||
      restaurant.subscription.endDate < new Date()
    ) {
      subUpdate.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    auditAction = "PLATFORM_SUBSCRIPTION_PLAN_CHANGE";
    metadata.plan = plan;
  } else if (action === "extend_trial") {
    const days = trialDays || 14;
    const base =
      restaurant.subscription?.endDate && restaurant.subscription.endDate > new Date()
        ? restaurant.subscription.endDate
        : new Date();
    subUpdate.status = "TRIAL";
    subUpdate.endDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    restaurantUpdate.isActive = true;
    auditAction = "PLATFORM_SUBSCRIPTION_EXTEND_TRIAL";
    metadata.trialDays = days;
  } else if (action === "set_status") {
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }
    subUpdate.status = status;
    if (status === "SUSPENDED" || status === "CANCELLED" || status === "EXPIRED") {
      restaurantUpdate.isActive = false;
    } else {
      restaurantUpdate.isActive = true;
    }
    auditAction = "PLATFORM_STATUS_CHANGE";
    metadata.status = status;
  } else if (status) {
    subUpdate.status = status;
    auditAction = "PLATFORM_STATUS_CHANGE";
    metadata.status = status;
  } else {
    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  }

  if (endDate) {
    subUpdate.endDate = new Date(endDate);
    metadata.endDate = endDate;
  }

  if (Object.keys(restaurantUpdate).length > 0) {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: restaurantUpdate,
    });
  }

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId },
    update: subUpdate,
    create: {
      restaurantId,
      plan: plan || "FREE",
      status: subUpdate.status || "TRIAL",
      endDate: subUpdate.endDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      ...subUpdate,
    },
  });

  await logPlatformAudit({
    userId: session!.user.id,
    restaurantId,
    action: auditAction,
    entity: "Subscription",
    entityId: subscription.id,
    metadata,
  });

  const updated = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { subscription: true },
  });

  const expiry = subscriptionExpiryInfo(updated?.subscription?.endDate);

  return NextResponse.json({
    restaurant: {
      id: updated!.id,
      name: updated!.nameAr || updated!.name,
      isActive: updated!.isActive,
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysRemaining: expiry.daysRemaining,
      isExpired: expiry.isExpired,
      expiryLabel: expiry.label,
    },
    subscription,
  });
}
