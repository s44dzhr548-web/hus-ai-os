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
import { formatRiyadhDateTime, formatRiyadhTime, formatDurationMinutes } from "@/lib/timezone";
import {
  resolveGuestCountWithDefault,
  sumVenuePeople,
} from "@/lib/visit-group-size";
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
  registeredCustomers: string;
  totalCompanions: string;
  totalVenueVisitors: string;
  averageGroupSize: string;
  largestGroup: string;
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
    registeredCustomers: withSuffix("عدد العملاء المسجلين", "عدد العملاء المسجلين"),
    totalCompanions: withSuffix("إجمالي المرافقين", "إجمالي المرافقين"),
    totalVenueVisitors: withSuffix("إجمالي زوار المكان", "إجمالي زوار المكان"),
    averageGroupSize: withSuffix("متوسط عدد الأشخاص لكل زيارة", "متوسط المجموعة"),
    largestGroup: withSuffix("أكبر مجموعة", "أكبر مجموعة"),
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
          guestCount: true,
          enteredAt: true,
          createdAt: true,
          exitedAt: true,
          endTime: true,
          visitStatus: true,
          tableId: true,
          tableNumber: true,
          tableDisplayNumber: true,
          tableLabel: true,
          sessionDurationMinutes: true,
          sessionStartedAt: true,
          sessionEndedAt: true,
          tableSessions: {
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              status: true,
              guestCount: true,
              reservation: {
                select: {
                  id: true,
                  arrivedAt: true,
                  guestCount: true,
                  actualArrivedGuestCount: true,
                } as Prisma.ReservationSelect,
              },
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
    const linkedSession = v.tableSessions.find((s) => s.reservation) ?? v.tableSessions[0];
    const reservation = linkedSession?.reservation ?? null;
    const sessionGuestCount = linkedSession?.guestCount ?? null;
    return {
      ...v,
      reservation,
      sessionGuestCount,
    };
  });

  const filtered = filterByActualEntry(visitsWithReservation, from, to).filter(
    (v) => !isQaTestRecord(v.customerName)
  ) as Array<(typeof visitsWithReservation)[number] & { actualEntryAt: Date }>;

  const enriched = filtered.map((v) => {
    const group = resolveGuestCountWithDefault({
      visitGuestCount: v.guestCount,
      actualArrivedGuestCount: v.reservation?.actualArrivedGuestCount ?? null,
      reservationGuestCount: v.reservation?.guestCount ?? null,
      sessionGuestCount: v.sessionGuestCount,
    });
    return { ...v, ...group };
  });

  const venueTotals = sumVenuePeople(enriched);
  const totalVisits = enriched.length;
  const actualEntries = totalVisits;
  const registeredCustomers = venueTotals.registeredCustomers;
  const totalCompanions = venueTotals.totalCompanions;
  const totalVenueVisitors = venueTotals.totalVenueVisitors;

  let largestGroup = 0;
  let firstEntryAt: Date | null = null;
  let lastEntryAt: Date | null = null;
  let afterMidnightEntries = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const v of enriched) {
    if (v.guestCount != null && v.guestCount > largestGroup) largestGroup = v.guestCount;
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

  const averageGroupSize =
    registeredCustomers > 0
      ? Math.round((totalVenueVisitors / registeredCustomers) * 10) / 10
      : 0;

  const visitDetails = enriched
    .sort((a, b) => b.actualEntryAt.getTime() - a.actualEntryAt.getTime())
    .slice(0, 500)
    .map((v) => {
      const exitedAt = v.exitedAt ?? v.endTime ?? null;
      return {
        visitId: v.id,
        customerId: v.customerProfileId,
        customerName: v.customerName,
        customerPhone: v.customerPhone,
        reservationId: v.reservation?.id ?? null,
        tableId: v.tableId,
        tableNumber: v.tableDisplayNumber ?? (v.tableNumber != null ? String(v.tableNumber) : null),
        tableLabel: v.tableLabel,
        checkedInAt: formatRiyadhDateTime(v.actualEntryAt),
        exitedAt: exitedAt ? formatRiyadhDateTime(exitedAt) : null,
        guestCount: v.guestCount,
        companionsCount: v.companionsCount,
        totalPeople: v.totalPeople,
        guestCountUnknown: v.guestCountUnknown,
        sessionDurationDisplay: formatDurationMinutes(v.sessionDurationMinutes),
        visitStatus: v.visitStatus,
      };
    });

  const byCustomer = new Map<
    string,
    {
      id: string;
      customerName: string;
      customerPhone: string | null;
      visitCount: number;
      totalSpending: number;
      isVip: boolean;
      totalCompanions: number;
      totalPeopleBrought: number;
      largestGroup: number;
      groupSizeSum: number;
    }
  >();

  for (const v of enriched) {
    const key = v.customerProfileId || v.customerPhone || v.customerName;
    const spend = Number(v.totalBill ?? 0);
    const people = v.totalPeople ?? 0;
    const companions = v.companionsCount ?? 0;
    const existing = byCustomer.get(key);
    if (existing) {
      existing.visitCount += 1;
      existing.totalSpending += spend;
      existing.totalCompanions += companions;
      existing.totalPeopleBrought += people;
      existing.groupSizeSum += people;
      if ((v.guestCount ?? 0) > existing.largestGroup) {
        existing.largestGroup = v.guestCount ?? 0;
      }
    } else {
      byCustomer.set(key, {
        id: v.customerProfileId || key,
        customerName: v.customerName,
        customerPhone: v.customerPhone,
        visitCount: 1,
        totalSpending: spend,
        isVip: v.customerProfile?.isVip ?? false,
        totalCompanions: companions,
        totalPeopleBrought: people,
        largestGroup: v.guestCount ?? 0,
        groupSizeSum: people,
      });
    }
  }

  const uniqueVisitors = byCustomer.size;
  const repeatCustomers = [...byCustomer.values()].filter((c) => c.visitCount >= 2).length;
  const vipVisitors = [...byCustomer.values()].filter((c) => c.isVip).length;
  const mostFrequentCustomers = [...byCustomer.values()]
    .sort((a, b) => b.visitCount - a.visitCount || b.totalPeopleBrought - a.totalPeopleBrought)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      visitCount: c.visitCount,
      totalSpending: c.totalSpending,
      isVip: c.isVip,
      totalCompanions: c.totalCompanions,
      totalPeopleBrought: c.totalPeopleBrought,
      averageGroupSize:
        c.visitCount > 0 ? Math.round((c.groupSizeSum / c.visitCount) * 10) / 10 : 0,
      largestGroup: c.largestGroup,
    }));

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
    registeredCustomers,
    totalCompanions,
    totalVenueVisitors,
    averageGroupSize,
    largestGroup,
    visitDetails,
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
