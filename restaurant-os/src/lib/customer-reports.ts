import prisma from "@/lib/prisma";
import type { Prisma, VisitStatus } from "@prisma/client";
import { RIYADH_TZ } from "@/lib/timezone";

export type ReportPeriod =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "custom"
  | "";

const ACTUAL_VISIT_STATUSES: VisitStatus[] = [
  "REGISTERED",
  "WAITING",
  "SEATED",
  "ACTIVE",
  "COMPLETED",
];

const QA_NAME_PATTERNS = [/register\s*qa/i, /^qa\s+/i, /test\s*customer/i];

export function isQaTestRecord(name?: string | null): boolean {
  if (!name) return false;
  return QA_NAME_PATTERNS.some((re) => re.test(name));
}

function riyadhParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return {
    year: parseInt(parts.find((p) => p.type === "year")?.value ?? "1970", 10),
    month: parseInt(parts.find((p) => p.type === "month")?.value ?? "01", 10),
    day: parseInt(parts.find((p) => p.type === "day")?.value ?? "01", 10),
  };
}

function riyadhDayStart(y: number, m: number, d: number): Date {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return new Date(`${y}-${mm}-${dd}T00:00:00+03:00`);
}

function riyadhDayEnd(y: number, m: number, d: number): Date {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return new Date(`${y}-${mm}-${dd}T23:59:59.999+03:00`);
}

export function startOfRiyadhDay(d: Date = new Date()): Date {
  const { year, month, day } = riyadhParts(d);
  return riyadhDayStart(year, month, day);
}

export function endOfRiyadhDay(d: Date = new Date()): Date {
  const { year, month, day } = riyadhParts(d);
  return riyadhDayEnd(year, month, day);
}

function addRiyadhDays(d: Date, offset: number): Date {
  const start = startOfRiyadhDay(d);
  return new Date(start.getTime() + offset * 86400000);
}

function startOfRiyadhMonth(year: number, month: number): Date {
  return riyadhDayStart(year, month, 1);
}

export function resolveDateRange(
  preset?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null
): { from?: Date; to?: Date; period: ReportPeriod } {
  const now = new Date();
  const period = (preset || "") as ReportPeriod;

  switch (period) {
    case "today":
      return { from: startOfRiyadhDay(now), to: endOfRiyadhDay(now), period };
    case "yesterday": {
      const y = addRiyadhDays(now, -1);
      return { from: startOfRiyadhDay(y), to: endOfRiyadhDay(y), period };
    }
    case "last7":
      return {
        from: startOfRiyadhDay(addRiyadhDays(now, -6)),
        to: endOfRiyadhDay(now),
        period,
      };
    case "last30":
      return {
        from: startOfRiyadhDay(addRiyadhDays(now, -29)),
        to: endOfRiyadhDay(now),
        period,
      };
    case "last90": {
      const { year, month } = riyadhParts(now);
      let startMonth = month - 2;
      let startYear = year;
      while (startMonth <= 0) {
        startMonth += 12;
        startYear -= 1;
      }
      return {
        from: startOfRiyadhMonth(startYear, startMonth),
        to: endOfRiyadhDay(now),
        period,
      };
    }
    case "custom": {
      const from = dateFrom ? new Date(`${dateFrom}T00:00:00+03:00`) : undefined;
      const to = dateTo ? new Date(`${dateTo}T23:59:59.999+03:00`) : undefined;
      return { from, to, period };
    }
    default:
      return {
        from: dateFrom ? new Date(`${dateFrom}T00:00:00+03:00`) : undefined,
        to: dateTo ? new Date(`${dateTo}T23:59:59.999+03:00`) : undefined,
        period: "",
      };
  }
}

export function reportPeriodLabels(period: ReportPeriod): {
  visitors: string;
  totalVisits: string;
  repeatCustomers: string;
  noShows: string;
  vipVisitors: string;
  topVisitors: string;
} {
  switch (period) {
    case "today":
      return {
        visitors: "زوار اليوم",
        totalVisits: "زيارات اليوم",
        repeatCustomers: "متكررون اليوم",
        noShows: "لم يحضروا اليوم",
        vipVisitors: "VIP اليوم",
        topVisitors: "الأكثر زيارة اليوم",
      };
    case "yesterday":
      return {
        visitors: "زوار أمس",
        totalVisits: "زيارات أمس",
        repeatCustomers: "متكررون أمس",
        noShows: "لم يحضروا أمس",
        vipVisitors: "VIP أمس",
        topVisitors: "الأكثر زيارة أمس",
      };
    case "last7":
      return {
        visitors: "زوار آخر 7 أيام",
        totalVisits: "زيارات آخر 7 أيام",
        repeatCustomers: "متكررون (7 أيام)",
        noShows: "لم يحضروا (7 أيام)",
        vipVisitors: "VIP (7 أيام)",
        topVisitors: "الأكثر زيارة (7 أيام)",
      };
    case "last30":
      return {
        visitors: "زوار آخر 30 يومًا",
        totalVisits: "زيارات آخر 30 يومًا",
        repeatCustomers: "متكررون (30 يوم)",
        noShows: "لم يحضروا (30 يوم)",
        vipVisitors: "VIP (30 يوم)",
        topVisitors: "الأكثر زيارة (30 يوم)",
      };
    case "last90":
      return {
        visitors: "زوار آخر 3 أشهر",
        totalVisits: "زيارات آخر 3 أشهر",
        repeatCustomers: "متكررون (3 أشهر)",
        noShows: "لم يحضروا (3 أشهر)",
        vipVisitors: "VIP (3 أشهر)",
        topVisitors: "الأكثر زيارة (3 أشهر)",
      };
    case "custom":
      return {
        visitors: "زوار الفترة المحددة",
        totalVisits: "زيارات الفترة",
        repeatCustomers: "متكررون في الفترة",
        noShows: "لم يحضروا في الفترة",
        vipVisitors: "VIP في الفترة",
        topVisitors: "الأكثر زيارة في الفترة",
      };
    default:
      return {
        visitors: "الزوار الفريدون",
        totalVisits: "إجمالي الزيارات",
        repeatCustomers: "العملاء المتكررون",
        noShows: "لم يحضروا",
        vipVisitors: "عملاء VIP",
        topVisitors: "الأكثر زيارة",
      };
  }
}

function visitTimeFilter(from?: Date, to?: Date): Prisma.CustomerVisitWhereInput {
  if (!from && !to) return {};
  const range = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  return { OR: [{ enteredAt: range }, { arrivalTime: range }] };
}

function baseVisitWhere(
  restaurantId: string,
  from?: Date,
  to?: Date,
  branchId?: string
): Prisma.CustomerVisitWhereInput {
  return {
    restaurantId,
    ...(branchId ? { branchId } : {}),
    visitStatus: { in: ACTUAL_VISIT_STATUSES },
    NOT: { customerName: { contains: "Register QA", mode: "insensitive" } },
    ...visitTimeFilter(from, to),
  };
}

/** Simpler QA exclusion — Prisma NOT with regex is awkward */
function excludeQaVisits<T extends { customerName: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isQaTestRecord(r.customerName));
}

export async function buildCustomerReports(
  restaurantId: string,
  from?: Date,
  to?: Date,
  period: ReportPeriod = "",
  branchId?: string
) {
  const visitWhere = baseVisitWhere(restaurantId, from, to, branchId);

  const [visits, noShows] = await Promise.all([
    prisma.customerVisit.findMany({
      where: visitWhere,
      select: {
        id: true,
        customerProfileId: true,
        customerName: true,
        customerPhone: true,
        totalBill: true,
        enteredAt: true,
        arrivalTime: true,
        customerProfile: { select: { isVip: true } },
      },
      take: 10000,
    }),
    prisma.reservation.count({
      where: {
        restaurantId,
        status: "NO_SHOW",
        ...(branchId ? { branchId } : {}),
        NOT: { customerName: { contains: "Register QA", mode: "insensitive" } },
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
  ]);

  const filtered = excludeQaVisits(visits);

  const totalVisits = filtered.length;
  const byCustomer = new Map<
    string,
    {
      id: string;
      customerName: string;
      customerPhone: string | null;
      visitCount: number;
      totalSpending: number;
      isVip: boolean;
    }
  >();

  for (const v of filtered) {
    const key = v.customerProfileId || v.customerPhone || v.customerName;
    const spend = Number(v.totalBill ?? 0);
    const existing = byCustomer.get(key);
    if (existing) {
      existing.visitCount += 1;
      existing.totalSpending += spend;
    } else {
      byCustomer.set(key, {
        id: v.customerProfileId || key,
        customerName: v.customerName,
        customerPhone: v.customerPhone,
        visitCount: 1,
        totalSpending: spend,
        isVip: v.customerProfile?.isVip ?? false,
      });
    }
  }

  const uniqueVisitors = byCustomer.size;
  const repeatCustomers = [...byCustomer.values()].filter((c) => c.visitCount >= 2).length;
  const vipVisitors = [...byCustomer.values()].filter((c) => c.isVip).length;
  const mostFrequentCustomers = [...byCustomer.values()]
    .sort((a, b) => b.visitCount - a.visitCount || b.totalSpending - a.totalSpending)
    .slice(0, 10);

  const labels = reportPeriodLabels(period);

  return {
    period,
    labels,
    from: from?.toISOString() ?? null,
    to: to?.toISOString() ?? null,
    uniqueVisitors,
    totalVisits,
    repeatCustomers,
    noShows,
    vipVisitors,
    mostFrequentCustomers,
    /** @deprecated use uniqueVisitors — kept for backward compat */
    visitedToday: uniqueVisitors,
    /** @deprecated use totalVisits */
    visitedThisMonth: totalVisits,
    /** @deprecated use vipVisitors */
    vipCustomers: vipVisitors,
  };
}
