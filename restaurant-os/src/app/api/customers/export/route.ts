import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import { getRestaurantBusinessDayConfig } from "@/lib/restaurant-config";
import {
  applyPhonePrivacy,
  canViewCustomerPhone,
  computeFavoriteTable,
  resolveDateRange,
  toCsv,
} from "@/lib/customer-history";
import { buildCustomerReports } from "@/lib/customer-reports";
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
  const businessConfig = await getRestaurantBusinessDayConfig(restaurantId!);
  const { from, to } = resolveDateRange(
    sp.get("period") || sp.get("preset"),
    sp.get("from") || sp.get("dateFrom"),
    sp.get("to") || sp.get("dateTo"),
    businessConfig
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

  if (type === "reports") {
    const period = (sp.get("period") || sp.get("preset") || "today") as Parameters<
      typeof buildCustomerReports
    >[3];
    const reports = await buildCustomerReports(
      restaurantId!,
      from,
      to,
      period,
      sp.get("branchId") || undefined,
      businessConfig
    );

    const summaryRows = [
      {
        metric: "registeredCustomers",
        label: "عدد العملاء المسجلين",
        value: reports.registeredCustomers ?? reports.totalVisits,
      },
      {
        metric: "totalCompanions",
        label: "إجمالي المرافقين",
        value: reports.totalCompanions ?? 0,
      },
      {
        metric: "totalVenueVisitors",
        label: "إجمالي زوار المكان",
        value: reports.totalVenueVisitors ?? 0,
      },
      {
        metric: "averageGroupSize",
        label: "متوسط المجموعة",
        value: reports.averageGroupSize ?? 0,
      },
      {
        metric: "largestGroup",
        label: "أكبر مجموعة",
        value: reports.largestGroup ?? 0,
      },
      {
        metric: "uniqueVisitors",
        label: "الزوار الفريدون",
        value: reports.uniqueVisitors,
      },
      {
        metric: "totalVisits",
        label: "عدد الزيارات",
        value: reports.totalVisits,
      },
      {
        metric: "afterMidnightEntries",
        label: "داخلين بعد منتصف الليل",
        value: reports.afterMidnightEntries ?? 0,
      },
    ];

    const visitRows = (reports.visitDetails ?? []).map((v) => ({
      customerName: v.customerName,
      customerPhone: showPhone ? v.customerPhone ?? "" : applyPhonePrivacy({ customerPhone: v.customerPhone }, role).customerPhone ?? "",
      companionsCount: v.companionsCount ?? 0,
      totalPeople: v.totalPeople ?? "",
      tableNumber: v.tableNumber ?? "",
      tableLabel: v.tableLabel ?? "",
      checkedInAt: v.checkedInAt ?? "",
      exitedAt: v.exitedAt ?? "",
      sessionDuration: v.sessionDurationDisplay ?? "",
      visitStatus: v.visitStatus ?? "",
    }));

    const topRows = reports.mostFrequentCustomers.map((c) => ({
      customerName: c.customerName,
      customerPhone: showPhone ? c.customerPhone ?? "" : applyPhonePrivacy({ customerPhone: c.customerPhone }, role).customerPhone ?? "",
      visitCount: c.visitCount,
      totalCompanions: c.totalCompanions ?? 0,
      totalPeopleBrought: c.totalPeopleBrought ?? 0,
      averageGroupSize: c.averageGroupSize ?? 0,
      largestGroup: c.largestGroup ?? 0,
      totalSpending: c.totalSpending,
    }));

    const summaryCsv = toCsv(["metric", "label", "value"], summaryRows);
    const visitsCsv = toCsv(
      [
        "customerName",
        "customerPhone",
        "companionsCount",
        "totalPeople",
        "tableNumber",
        "tableLabel",
        "checkedInAt",
        "exitedAt",
        "sessionDuration",
        "visitStatus",
      ],
      visitRows
    );
    const topCsv = toCsv(
      [
        "customerName",
        "customerPhone",
        "visitCount",
        "totalCompanions",
        "totalPeopleBrought",
        "averageGroupSize",
        "largestGroup",
        "totalSpending",
      ],
      topRows
    );

    csv = `${summaryCsv}\r\n\r\n${visitsCsv}\r\n\r\n${topCsv}`;
    filename = "visitor-reports.csv";
  } else if (type === "reservations") {
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
      ...(dateFilter
        ? { OR: [{ enteredAt: dateFilter }, { arrivalTime: dateFilter }] }
        : {}),
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
        companionsCount: s.companionsCount ?? 0,
        totalPeople: s.totalPeople ?? s.guestCount,
        guestCount: s.guestCount,
        minimumSpendAmount: s.minimumSpendAmount ?? "",
        arrivalTime: s.arrivalTime,
        endTime: s.endTime ?? "",
        exitedAt: s.exitedAt ?? "",
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
        "companionsCount",
        "totalPeople",
        "guestCount",
        "minimumSpendAmount",
        "arrivalTime",
        "endTime",
        "exitedAt",
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
