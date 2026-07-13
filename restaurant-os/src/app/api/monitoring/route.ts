import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { MONITORING_OWNER_ROLES } from "@/lib/monitoring/types";
import {
  evaluateOwnerAlerts,
  getActivityTimeline,
  getImmutableAuditFeed,
  getLiveCustomers,
  getMonitoringStats,
  getStaffPerformance,
  searchMonitoring,
} from "@/lib/monitoring/service";
import { getStaffLoginHistory } from "@/lib/staff-activity";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole([...MONITORING_OWNER_ROLES]);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const section = req.nextUrl.searchParams.get("section") || "dashboard";
  const branchId = req.nextUrl.searchParams.get("branchId") || undefined;
  const q = req.nextUrl.searchParams.get("q") || "";

  if (section === "dashboard") {
    const [stats, liveCustomers, timeline, staffTop, notifications] = await Promise.all([
      getMonitoringStats(restaurantId!, branchId),
      getLiveCustomers(restaurantId!, branchId),
      getActivityTimeline(restaurantId!, 50),
      getStaffPerformance(restaurantId!),
      prisma.ownerNotification.findMany({
        where: { restaurantId: restaurantId!, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    await evaluateOwnerAlerts(restaurantId!, branchId);
    return NextResponse.json({
      stats,
      liveCustomers,
      timeline,
      staffTop,
      notifications,
    });
  }

  if (section === "live") {
    return NextResponse.json({ liveCustomers: await getLiveCustomers(restaurantId!, branchId) });
  }

  if (section === "staff") {
    return NextResponse.json({ staff: await getStaffPerformance(restaurantId!) });
  }

  if (section === "timeline") {
    return NextResponse.json({ timeline: await getActivityTimeline(restaurantId!, 100) });
  }

  if (section === "login-history") {
    const logs = await getStaffLoginHistory(restaurantId!, { limit: 200 });
    return NextResponse.json({ logs });
  }

  if (section === "audit") {
    return NextResponse.json({ audit: await getImmutableAuditFeed(restaurantId!, 150) });
  }

  if (section === "search") {
    return NextResponse.json(
      await searchMonitoring(restaurantId!, q, {
        dateFrom: req.nextUrl.searchParams.get("dateFrom") || undefined,
        dateTo: req.nextUrl.searchParams.get("dateTo") || undefined,
        status: req.nextUrl.searchParams.get("status") || undefined,
      })
    );
  }

  if (section === "notifications") {
    const notifications = await prisma.ownerNotification.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ notifications });
  }

  return NextResponse.json({ error: "قسم غير معروف" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (body.action === "mark-notification-read" && body.id) {
    await prisma.ownerNotification.updateMany({
      where: { id: body.id, restaurantId: restaurantId! },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update-settings" && body.settings) {
    await prisma.restaurant.update({
      where: { id: restaurantId! },
      data: { monitoringSettingsJson: body.settings },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
