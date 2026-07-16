import prisma from "@/lib/prisma";
import type { Prisma, VisitStatus } from "@prisma/client";
import {
  BUSINESS_DAY_NOTE_AR,
  formatOperationalPeriodLabel,
  type ReportPeriod,
} from "@/lib/business-day";
import {
  actualEntryBroadWhere,
  filterByActualEntry,
  isAfterMidnightEntry,
  resolveActualEntryAt,
} from "@/lib/actual-entry";
import { formatRiyadhDateTime } from "@/lib/timezone";
import type { BusinessDayConfig } from "@/lib/business-day";

export type { ReportPeriod } from "@/lib/business-day";
export {
  resolveDateRange,
  startOfRiyadhDay,
  endOfRiyadhDay,
  getBusinessDayRange,
  currentBusinessDate,
  BUSINESS_DAY_NOTE_AR,
  formatOperationalPeriodLabel,
} from "@/lib/business-day";

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

export function reportPeriodLabels(period: ReportPeriod): {
  visitors: string;
  totalVisits: string;
  repeatCustomers: string;
  noShows: string;
  vipVisitors: string;
  topVisitors: string;
  actualEntries: string;
  firstEntry: string;
  lastEntry: string;
  afterMidnight: string;
  avgSession: string;
  completedSessions: string;
  activeSessions: string;
} {
  const suffix = (() => {
    switch (period) {
      case "today":
        return "اليوم";
      case "yesterday":
        return "أمس";
      case "last7":
        return "(7 أيام)";
      case "last30":
        return "(30 يوم)";
      case "last90":
        return "(3 أشهر)";
      case "custom":
        return "في الفترة";
      default:
        return "";
    }
  })();

  const withSuffix = (base: string, alt?: string) =>
    suffix ? `${base} ${suffix}` : alt ?? base;

  return {
    visitors: withSuffix("الزوار الفريدون", "الزوار الفريدون"),
    totalVisits: withSuffix("زيارات", "إجمالي الزيارات"),
    repeatCustomers: withSuffix("متكررون", "العملاء المتكررون"),
    noShows: withSuffix("لم يحضروا", "لم يحضروا"),
    vipVisitors: withSuffix("VIP", "عملاء VIP"),
    topVisitors: withSuffix("الأكثر زيارة", "الأكثر زيارة"),
    actualEntries: withSuffix("عدد الداخلين الفعلي", "عدد الداخلين الفعلي"),
    firstEntry: withSuffix("وقت أول دخول", "وقت أول دخول"),
    lastEntry: withSuffix("وقت آخر دخول", "وقت آخر دخول"),
    afterMidnight: withSuffix("داخلين بعد منتصف الليل", "عدد الداخلين بعد منتصف الليل"),
    avgSession: withSuffix("متوسط مدة الجلسة", "متوسط مدة الجلسة"),
    completedSessions: withSuffix("جلسات مكتملة", "عدد الجلسات المكتملة"),
    activeSessions: withSuffix("جلسات نشطة", "عدد الجلسات النشطة"),
  };
}

export async function buildCustomerReports(
  restaurantId: string,
  from?: Date,
  to?: Date,
  period: ReportPeriod = "",
  branchId?: string,
  config?: BusinessDayConfig
) {
  const timezone = config?.timezone ?? "Asia/Riyadh";
  const businessDayStartHour = config?.businessDayStartHour ?? 4;

  const broadFilter = actualEntryBroadWhere(from, to);
  const visitWhere: Prisma.CustomerVisitWhereInput = {
    restaurantId,
    ...(branchId ? { branchId } : {}),
    visitStatus: { in: ACTUAL_VISIT_STATUSES },
    NOT: { customerName: { contains: "Register QA", mode: "insensitive" } },
    ...(broadFilter ?? {}),
  };

  const [visitsRaw, noShows, activeSessionsCount, completedSessionsInPeriod] =
    await Promise.all([
      prisma.customerVisit.findMany({
        where: visitWhere,
        select: {
          id: true,
          customerProfileId: true,
          customerName: true,
          customerPhone: true,
          totalBill: true,
          enteredAt: true,
          createdAt: true,
          visitStatus: true,
          sessionDurationMinutes: true,
          sessionStartedAt: true,
          sessionEndedAt: true,
          tableSessions: {
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              status: true,
              reservation: { select: { arrivedAt: true } },
            },
          },
          customerProfile: { select: { isVip: true } },
        },
        take: 15000,
      }),
      prisma.reservation.count({
        where: {
          restaurantId,
          status: "NO_SHOW",
          ...(branchId ? { branchId } : {}),
          NOT: { customerName: { contains: "Register QA", mode: "insensitive" } },
          ...(from || to
            ? {
                OR: [
                  ...(from || to
                    ? [
                        {
                          noShowAt: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                          },
                        },
                      ]
                    : []),
                  {
                    date: {
                      ...(from ? { gte: from } : {}),
                      ...(to ? { lte: to } : {}),
                    },
                  },
                ],
              }
            : {}),
        },
      }),
      prisma.tableSession.count({
        where: {
          restaurantId,
          endedAt: null,
          status: { not: "COMPLETED" },
          ...(branchId ? { branchId } : {}),
        },
      }),
      prisma.tableSession.count({
        where: {
          restaurantId,
          status: "COMPLETED",
          ...(branchId ? { branchId } : {}),
          ...(from || to
            ? {
                endedAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
      }),
    ]);

  const visitsWithReservation = visitsRaw.map((v) => {
    const reservationArrived = v.tableSessions.find((s) => s.reservation?.arrivedAt)
      ?.reservation;
    return {
      ...v,
      reservation: reservationArrived ?? null,
    };
  });

  const filtered = filterByActualEntry(visitsWithReservation, from, to).filter(
    (v) => !isQaTestRecord(v.customerName)
  );

  const totalVisits = filtered.length;
  const actualEntries = totalVisits;

  let firstEntryAt: Date | null = null;
  let lastEntryAt: Date | null = null;
  let afterMidnightEntries = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const v of filtered) {
    if (!firstEntryAt || v.actualEntryAt < firstEntryAt) firstEntryAt = v.actualEntryAt;
    if (!lastEntryAt || v.actualEntryAt > lastEntryAt) lastEntryAt = v.actualEntryAt;
    if (isAfterMidnightEntry(v.actualEntryAt, timezone, businessDayStartHour)) {
      afterMidnightEntries++;
    }
    if (v.sessionDurationMinutes != null) {
      durationSum += v.sessionDurationMinutes;
      durationCount++;
    } else if (v.sessionStartedAt && v.sessionEndedAt) {
      durationSum += Math.max(
        0,
        Math.round(
          (v.sessionEndedAt.getTime() - v.sessionStartedAt.getTime()) / 60000
        )
      );
      durationCount++;
    }
  }

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
    businessDayNote: BUSINESS_DAY_NOTE_AR,
    operationalPeriodLabel:
      from && to ? formatOperationalPeriodLabel(from, to, timezone) : null,
    uniqueVisitors,
    totalVisits,
    actualEntries,
    repeatCustomers,
    noShows,
    vipVisitors,
    mostFrequentCustomers,
    firstEntryAt: firstEntryAt ? formatRiyadhDateTime(firstEntryAt) : null,
    lastEntryAt: lastEntryAt ? formatRiyadhDateTime(lastEntryAt) : null,
    afterMidnightEntries,
    avgSessionDurationMinutes:
      durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    completedSessions: completedSessionsInPeriod,
    activeSessions: activeSessionsCount,
    /** @deprecated use uniqueVisitors */
    visitedToday: uniqueVisitors,
    /** @deprecated use totalVisits */
    visitedThisMonth: totalVisits,
    /** @deprecated use vipVisitors */
    vipCustomers: vipVisitors,
  };
}

export { resolveActualEntryAt, filterByActualEntry };
