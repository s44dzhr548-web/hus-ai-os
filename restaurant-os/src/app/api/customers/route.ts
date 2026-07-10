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
  const preset = sp.get("preset");
  const { from, to } = resolveDateRange(
    preset,
    sp.get("dateFrom"),
    sp.get("dateTo")
  );

  const phone = sp.get("phone")?.trim();
  const name = sp.get("name")?.trim();
  const tableNumber = sp.get("tableNumber");
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
    return NextResponse.json(await buildReports(restaurantId!, from, to));
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
      ...(status && status !== "all"
        ? { visitStatus: status as VisitStatus }
        : {}),
      ...(dateFilter ? { arrivalTime: dateFilter } : {}),
    };

    const visits = await prisma.customerVisit.findMany({
      where,
      orderBy: { arrivalTime: "desc" },
      take: 500,
    });

    return NextResponse.json({
      visits: visits.map((v) =>
        applyPhonePrivacy(serializeCustomerVisit(v), role)
      ),
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

async function buildReports(
  restaurantId: string,
  from?: Date,
  to?: Date
) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const [
    visitedToday,
    visitedThisMonth,
    totalVisits,
    noShows,
    repeatCustomers,
    vipCustomers,
    frequentCustomers,
  ] = await Promise.all([
    prisma.customerVisit.count({
      where: {
        restaurantId,
        arrivalTime: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.customerVisit.count({
      where: {
        restaurantId,
        arrivalTime: { gte: startOfMonth },
      },
    }),
    prisma.customerVisit.count({
      where: {
        restaurantId,
        ...(from || to
          ? {
              arrivalTime: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
    }),
    prisma.reservation.count({
      where: {
        restaurantId,
        status: "NO_SHOW",
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
    }),
    prisma.customerProfile.count({
      where: { restaurantId, visitCount: { gt: 1 } },
    }),
    prisma.customerProfile.count({
      where: { restaurantId, isVip: true },
    }),
    prisma.customerProfile.findMany({
      where: { restaurantId, visitCount: { gt: 0 } },
      orderBy: { visitCount: "desc" },
      take: 10,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        visitCount: true,
        totalSpending: true,
        lastVisitAt: true,
        isVip: true,
      },
    }),
  ]);

  return {
    visitedToday,
    visitedThisMonth,
    totalVisits,
    noShows,
    repeatCustomers,
    vipCustomers,
    mostFrequentCustomers: frequentCustomers.map((c) => ({
      ...c,
      totalSpending: Number(c.totalSpending),
      lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    })),
  };
}
