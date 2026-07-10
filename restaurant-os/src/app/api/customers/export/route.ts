import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  applyPhonePrivacy,
  canViewCustomerPhone,
  computeFavoriteTable,
  resolveDateRange,
  toCsv,
} from "@/lib/customer-history";
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
  const type = sp.get("type") || "customers";
  const role = session?.user.role;
  const showPhone = canViewCustomerPhone(role);
  const { from, to } = resolveDateRange(
    sp.get("preset"),
    sp.get("dateFrom"),
    sp.get("dateTo")
  );

  const phone = sp.get("phone")?.trim();
  const name = sp.get("name")?.trim();
  const tableNumber = sp.get("tableNumber");
  const status = sp.get("status");

  const dateFilter =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  let csv = "";
  let filename = "export.csv";

  if (type === "reservations") {
    const reservations = await prisma.reservation.findMany({
      where: {
        restaurantId: restaurantId!,
        ...(phone ? { customerPhone: { contains: phone } } : {}),
        ...(name ? { customerName: { contains: name, mode: "insensitive" } } : {}),
        ...(tableNumber ? { tableNumber: parseInt(tableNumber) } : {}),
        ...(status && status !== "all"
          ? { status: status as ReservationStatus }
          : {}),
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });

    const rows = reservations.map((r) => {
      const s = serializeReservation(r);
      return {
        customerName: s.customerName,
        customerPhone: showPhone ? s.customerPhone : applyPhonePrivacy(s, role).customerPhone,
        date: s.date.split("T")[0],
        time: s.time,
        guestCount: s.guestCount,
        tableNumber: s.tableNumber ?? "",
        occasion: s.occasion ?? "",
        notes: s.notes ?? "",
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        arrivedAt: s.arrivedAt ?? "",
        completedAt: s.completedAt ?? "",
        cancelledAt: s.cancelledAt ?? "",
        noShowAt: s.noShowAt ?? "",
      };
    });

    csv = toCsv(
      [
        "customerName",
        "customerPhone",
        "date",
        "time",
        "guestCount",
        "tableNumber",
        "occasion",
        "notes",
        "status",
        "createdAt",
        "updatedAt",
        "arrivedAt",
        "completedAt",
        "cancelledAt",
        "noShowAt",
      ],
      rows
    );
    filename = "reservations.csv";
  } else if (type === "visits") {
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
    });

    const rows = visits.map((v) => {
      const s = serializeCustomerVisit(v);
      return {
        customerName: s.customerName,
        customerPhone: showPhone ? s.customerPhone : applyPhonePrivacy(s, role).customerPhone,
        tableNumber: s.tableNumber ?? "",
        guestCount: s.guestCount,
        minimumSpendAmount: s.minimumSpendAmount ?? "",
        arrivalTime: s.arrivalTime,
        endTime: s.endTime ?? "",
        totalBill: s.totalBill,
        ordersCount: s.ordersCount,
        visitStatus: s.visitStatus,
        notes: s.notes ?? "",
      };
    });

    csv = toCsv(
      [
        "customerName",
        "customerPhone",
        "tableNumber",
        "guestCount",
        "minimumSpendAmount",
        "arrivalTime",
        "endTime",
        "totalBill",
        "ordersCount",
        "visitStatus",
        "notes",
      ],
      rows
    );
    filename = "visits.csv";
  } else {
    const profiles = await prisma.customerProfile.findMany({
      where: {
        restaurantId: restaurantId!,
        ...(phone ? { customerPhone: { contains: phone } } : {}),
        ...(name ? { customerName: { contains: name, mode: "insensitive" } } : {}),
      },
      include: {
        visits: {
          where: { visitStatus: "COMPLETED" },
          select: { tableNumber: true },
        },
      },
      orderBy: { lastVisitAt: "desc" },
    });

    const rows = profiles.map((p) => ({
      customerName: p.customerName,
      customerPhone: showPhone
        ? p.customerPhone ?? ""
        : applyPhonePrivacy({ customerPhone: p.customerPhone }, role).customerPhone ?? "",
      visitCount: p.visitCount,
      lastVisitAt: p.lastVisitAt?.toISOString() ?? "",
      totalSpending: Number(p.totalSpending),
      favoriteTable: computeFavoriteTable(p.visits) ?? "",
      isVip: p.isVip ? "yes" : "no",
      notes: p.notes ?? "",
    }));

    csv = toCsv(
      [
        "customerName",
        "customerPhone",
        "visitCount",
        "lastVisitAt",
        "totalSpending",
        "favoriteTable",
        "isVip",
        "notes",
      ],
      rows
    );
    filename = "customers.csv";
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
