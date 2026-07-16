import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  applyPhonePrivacy,
  canViewCustomerPhone,
  computeFavoriteTable,
  computeFavoriteArea,
  resolveDateRange,
} from "@/lib/customer-history";
import { getRestaurantBusinessDayConfig } from "@/lib/restaurant-config";
import { buildCustomerReports } from "@/lib/customer-reports";
import { loadStaffNameMap } from "@/lib/staff-names";
import { buildVisitReports } from "@/lib/staff-activity-service";
import { tableIconEmoji } from "@/lib/table-meta";
import {
  serializeCustomerVisit,
  serializeReservation,
} from "@/lib/reception";
import type { Prisma, ReservationStatus, VisitStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const CUSTOMER_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(CUSTOMER_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const sp = req.nextUrl.searchParams;
  const role = session?.user.role;
  const preset = sp.get("period") || sp.get("preset");
  const businessConfig = await getRestaurantBusinessDayConfig(restaurantId!);
  const { from, to, period } = resolveDateRange(
    preset,
    sp.get("from") || sp.get("dateFrom"),
    sp.get("to") || sp.get("dateTo"),
    businessConfig
  );

  const phone = sp.get("phone")?.trim();
  const name = sp.get("name")?.trim();
  const tableNumber = sp.get("tableNumber");
  const tableId = sp.get("tableId");
  const branchId = sp.get("branchId");
  const staffUserId = sp.get("staffUserId");
  const status = sp.get("status");
  const view = sp.get("view") || "customers";

  const dateFilter =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  if (view === "reports") {
    const branchId = sp.get("branchId") || undefined;
    const [reports, visitReports] = await Promise.all([
      buildCustomerReports(restaurantId!, from, to, period, branchId, businessConfig),
      buildVisitReports(restaurantId!, from, to, businessConfig),
    ]);
    return NextResponse.json({ ...reports, visitReports });
  }

  if (view === "reservations") {
    const where: Prisma.ReservationWhereInput = {
      restaurantId: restaurantId!,
      ...(phone ? { customerPhone: { contains: phone } } : {}),
      ...(name ? { customerName: { contains: name, mode: "insensitive" } } : {}),
      ...(tableNumber ? { tableNumber: parseInt(tableNumber) } : {}),
      ...(status && status !== "all"
        ? status === "CONFIRMED"
          ? { status: { in: ["CONFIRMED", "APPROVED"] } }
          : { status: status as ReservationStatus }
        : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
    };

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ date: "desc" }, { time: "desc" }],
      take: 500,
    });

    return NextResponse.json({
      reservations: reservations.map((r) =>
        applyPhonePrivacy(serializeReservation(r), role)
      ),
    });
  }

  if (view === "visits") {
    const where: Prisma.CustomerVisitWhereInput = {
      restaurantId: restaurantId!,
      ...(phone ? { customerPhone: { contains: phone } } : {}),
      ...(name ? { customerName: { contains: name, mode: "insensitive" } } : {}),
      ...(tableNumber ? { tableNumber: parseInt(tableNumber) } : {}),
      ...(tableId ? { tableId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(status && status !== "all"
        ? { visitStatus: status as VisitStatus }
        : {}),
      AND:
        staffUserId || dateFilter
          ? [
              ...(staffUserId
                ? [
                    {
                      OR: [
                        { registeredByUserId: staffUserId },
                        { assignedByUserId: staffUserId },
                        { startedByUserId: staffUserId },
                        { closedByUserId: staffUserId },
                      ],
                    },
                  ]
                : []),
              ...(dateFilter
                ? [{ OR: [{ enteredAt: dateFilter }, { arrivalTime: dateFilter }] }]
                : []),
            ]
          : undefined,
    };

    const visits = await prisma.customerVisit.findMany({
      where,
      orderBy: [{ enteredAt: "desc" }, { arrivalTime: "desc" }],
      take: 500,
    });

    const staffNames = await loadStaffNameMap(
      visits.flatMap((v) => [
        v.registeredByUserId,
        v.assignedByUserId,
        v.startedByUserId,
        v.closedByUserId,
      ])
    );

    const branches = await prisma.branch.findMany({
      where: { restaurantId: restaurantId!, isActive: true },
      select: { id: true, name: true, nameAr: true },
    });
    const branchMap = new Map(branches.map((b) => [b.id, b.nameAr || b.name]));

    return NextResponse.json({
      visits: visits.map((v) =>
        applyPhonePrivacy(
          {
            ...serializeCustomerVisit(v, staffNames),
            branchName: v.branchId ? branchMap.get(v.branchId) ?? null : null,
          },
          role
        )
      ),
      filters: {
        branches,
        staff: await prisma.staff.findMany({
          where: { restaurantId: restaurantId!, isActive: true },
          select: { userId: true, name: true, role: true },
        }),
      },
    });
  }

  // Default: customer profiles
  const profileWhere: Prisma.CustomerProfileWhereInput = {
    restaurantId: restaurantId!,
    ...(phone ? { customerPhone: { contains: phone } } : {}),
    ...(name ? { customerName: { contains: name, mode: "insensitive" } } : {}),
    ...(dateFilter
      ? {
          OR: [
            { lastVisitAt: dateFilter },
            { visits: { some: { arrivalTime: dateFilter } } },
            { reservations: { some: { date: dateFilter } } },
          ],
        }
      : {}),
  };

  const profiles = await prisma.customerProfile.findMany({
    where: profileWhere,
    orderBy: { lastVisitAt: "desc" },
    take: 200,
    include: {
      visits: {
        where: { visitStatus: "COMPLETED" },
        select: { tableNumber: true, tableLabel: true, tableZone: true, tableIcon: true },
      },
      reservations: {
        orderBy: { date: "desc" },
        take: 5,
      },
    },
  });

  const customers = profiles.map((p) => ({
    id: p.id,
    customerName: p.customerName,
    customerPhone: canViewCustomerPhone(role)
      ? p.customerPhone
      : applyPhonePrivacy({ customerPhone: p.customerPhone }, role).customerPhone,
    visitCount: p.visitCount,
    totalSpending: Number(p.totalSpending),
    lastVisitAt: p.lastVisitAt?.toISOString() ?? null,
    isVip: p.isVip,
    notes: p.notes,
    favoriteTable: computeFavoriteTable(p.visits),
    favoriteArea: computeFavoriteArea(p.visits),
    recentReservations: p.reservations.map((r) =>
      applyPhonePrivacy(serializeReservation(r), role)
    ),
  }));

  return NextResponse.json({ customers });
}
