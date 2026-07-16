import prisma from "@/lib/prisma";
import { resolveDateRange } from "@/lib/customer-history";
import { getRestaurantBusinessDayConfig } from "@/lib/restaurant-config";
import { actualEntryBroadWhere } from "@/lib/actual-entry";
import {
  DEFAULT_MONITORING_SETTINGS,
  parseMonitoringSettings,
  SESSION_STATUS_AR,
  type MonitoringSettings,
} from "./types";

function minutesBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

function sessionStatusLabel(status: string) {
  return SESSION_STATUS_AR[status] ?? status;
}

export async function getMonitoringSettings(restaurantId: string): Promise<MonitoringSettings> {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { monitoringSettingsJson: true },
  });
  return parseMonitoringSettings(r?.monitoringSettingsJson);
}

export async function getMonitoringStats(restaurantId: string, branchId?: string) {
  const businessConfig = await getRestaurantBusinessDayConfig(restaurantId);
  const { from: todayStart, to: todayEnd } = resolveDateRange(
    "today",
    null,
    null,
    businessConfig
  );
  const branchFilter = branchId ? { branchId } : {};

  const [
    activeSessions,
    enteredToday,
    leftToday,
    completedSessionsToday,
    reservationsToday,
    cancelledReservationsToday,
    totalTables,
    occupiedTables,
    completedSessionsForAvg,
  ] = await Promise.all([
    prisma.tableSession.count({
      where: {
        restaurantId,
        endedAt: null,
        status: { not: "COMPLETED" },
        ...branchFilter,
      },
    }),
    prisma.customerVisit.count({
      where: {
        restaurantId,
        ...actualEntryBroadWhere(todayStart, todayEnd),
      },
    }),
    prisma.customerVisit.count({
      where: {
        restaurantId,
        visitStatus: "COMPLETED",
        endTime: { gte: todayStart!, lte: todayEnd! },
      },
    }),
    prisma.tableSession.count({
      where: {
        restaurantId,
        status: "COMPLETED",
        endedAt: { gte: todayStart!, lte: todayEnd! },
        ...branchFilter,
      },
    }),
    prisma.reservation.count({
      where: {
        restaurantId,
        date: { gte: todayStart!, lte: todayEnd! },
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.reservation.count({
      where: {
        restaurantId,
        status: "CANCELLED",
        cancelledAt: { gte: todayStart!, lte: todayEnd! },
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.diningTable.count({
      where: {
        branch: { restaurantId },
        isActive: true,
        isArchived: false,
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.diningTable.count({
      where: {
        branch: { restaurantId },
        isActive: true,
        isArchived: false,
        operationalStatus: "OCCUPIED",
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.tableSession.findMany({
      where: {
        restaurantId,
        endedAt: { not: null },
        startedAt: { gte: todayStart!, lte: todayEnd! },
        ...branchFilter,
      },
      select: { startedAt: true, endedAt: true },
      take: 500,
    }),
  ]);

  const avgSessionMinutes =
    completedSessionsForAvg.length > 0
      ? Math.round(
          completedSessionsForAvg.reduce(
            (sum, s) => sum + minutesBetween(s.startedAt, s.endedAt!),
            0
          ) / completedSessionsForAvg.length
        )
      : 0;

  const freeTables = Math.max(0, totalTables - occupiedTables);
  const occupancyRate =
    totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return {
    customersInside: activeSessions,
    enteredToday,
    leftToday,
    avgSessionMinutes,
    occupancyRate,
    activeTables: occupiedTables,
    freeTables,
    reservationsToday,
    completedSessionsToday,
    cancelledReservationsToday,
    totalTables,
  };
}

export async function getLiveCustomers(restaurantId: string, branchId?: string) {
  const now = new Date();
  const sessions = await prisma.tableSession.findMany({
    where: {
      restaurantId,
      endedAt: null,
      status: { not: "COMPLETED" },
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { startedAt: "asc" },
    include: {
      table: { select: { number: true, label: true } },
    },
  });

  return sessions.map((s) => {
    const waitingMinutes =
      s.status === "WAITING" ? minutesBetween(s.startedAt, now) : 0;
    const sessionMinutes = minutesBetween(s.startedAt, now);
    return {
      id: s.id,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      tableNumber: s.tableNumber,
      tableLabel: s.tableLabel ?? s.table?.label,
      enteredAt: s.startedAt.toISOString(),
      waitingMinutes,
      sessionMinutes,
      staffName: s.staffMemberName,
      status: s.status,
      statusLabel: sessionStatusLabel(s.status),
    };
  });
}

export async function getStaffPerformance(restaurantId: string) {
  const businessConfig = await getRestaurantBusinessDayConfig(restaurantId);
  const { from: todayStart, to: todayEnd } = resolveDateRange(
    "today",
    null,
    null,
    businessConfig
  );
  const weekRange = resolveDateRange("last7", null, null, businessConfig);
  const monthRange = resolveDateRange("last30", null, null, businessConfig);
  const weekStart = weekRange.from!;
  const monthStart = monthRange.from!;

  const staffList = await prisma.staff.findMany({
    where: { restaurantId, isActive: true },
    select: { id: true, name: true, userId: true },
  });

  const [
    sessionAudits,
    assignments,
    closedVisits,
    activityLogs,
    completedSessions,
  ] = await Promise.all([
    prisma.sessionAuditLog.findMany({
      where: { restaurantId, createdAt: { gte: monthStart } },
      select: { staffName: true, staffUserId: true, createdAt: true, sessionId: true },
    }),
    prisma.tableAssignment.findMany({
      where: { restaurantId, createdAt: { gte: monthStart } },
      select: { staffName: true, createdAt: true },
    }),
    prisma.customerVisit.findMany({
      where: {
        restaurantId,
        closedByStaffName: { not: null },
        endTime: { gte: monthStart },
      },
      select: {
        closedByStaffName: true,
        endTime: true,
        arrivalTime: true,
        createdAt: true,
      },
    }),
    prisma.staffActivityLog.findMany({
      where: { restaurantId, createdAt: { gte: monthStart } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tableSession.findMany({
      where: {
        restaurantId,
        status: "COMPLETED",
        endedAt: { gte: monthStart },
        staffMemberName: { not: null },
      },
      select: {
        staffMemberName: true,
        startedAt: true,
        endedAt: true,
      },
    }),
  ]);

  const metrics = staffList.map((staff) => {
    const name = staff.name;
    const sessionsByStaff = completedSessions.filter((s) => s.staffMemberName === name);
    const visitsClosed = closedVisits.filter((v) => v.closedByStaffName === name);
    const assigns = assignments.filter((a) => a.staffName === name);
    const audits = sessionAudits.filter(
      (a) => a.staffName === name || a.staffUserId === staff.userId
    );

    const countInRange = (dates: Date[], from: Date, to: Date) =>
      dates.filter((d) => d >= from && d <= to).length;

    const servedToday = countInRange(
      visitsClosed.map((v) => v.endTime ?? v.createdAt),
      todayStart!,
      todayEnd!
    );
    const servedWeek = visitsClosed.filter(
      (v) => (v.endTime ?? v.createdAt) >= weekStart
    ).length;
    const servedMonth = visitsClosed.length;

    const staffLogs = activityLogs.filter(
      (l) => l.staffId === staff.id || l.staffName === name
    );
    const logins = staffLogs.filter((l) => l.action === "LOGIN");
    const logouts = staffLogs.filter((l) => l.action === "LOGOUT");

    let workingMinutes = 0;
    for (let i = 0; i < logins.length; i++) {
      const loginAt = logins[i].createdAt;
      const logout = logouts.find((o) => o.createdAt > loginAt);
      if (logout) workingMinutes += minutesBetween(loginAt, logout.createdAt);
    }

    const serviceTimes = sessionsByStaff
      .filter((s) => s.endedAt)
      .map((s) => minutesBetween(s.startedAt, s.endedAt!));
    const stayTimes = visitsClosed
      .filter((v) => v.arrivalTime && v.endTime)
      .map((v) => minutesBetween(v.arrivalTime!, v.endTime!));

    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return {
      staffId: staff.id,
      name,
      customersToday: servedToday,
      customersWeek: servedWeek,
      customersMonth: servedMonth,
      reservationsCreated: 0,
      tablesAssigned: assigns.length,
      sessionsCompleted: sessionsByStaff.length,
      auditActions: audits.length,
      avgServiceMinutes: avg(serviceTimes),
      avgStayMinutes: avg(stayTimes),
      firstLogin: logins[0]?.createdAt.toISOString() ?? null,
      lastLogout: logouts.length ? logouts[logouts.length - 1].createdAt.toISOString() : null,
      workingHours: Math.round((workingMinutes / 60) * 10) / 10,
    };
  });

  return metrics
    .sort(
      (a, b) =>
        b.customersMonth +
        b.sessionsCompleted +
        b.tablesAssigned -
        (a.customersMonth + a.sessionsCompleted + a.tablesAssigned)
    )
    .slice(0, 10);
}

export async function getActivityTimeline(restaurantId: string, limit = 80) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [staffLogs, sessionAudits, assignments, orders, visits] = await Promise.all([
    prisma.staffActivityLog.findMany({
      where: { restaurantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.sessionAuditLog.findMany({
      where: { restaurantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.tableAssignment.findMany({
      where: { restaurantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.order.findMany({
      where: {
        branch: { restaurantId },
        createdAt: { gte: since },
        status: { in: ["NEW", "PREPARING", "READY"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { orderNumber: true, createdAt: true, status: true },
    }),
    prisma.customerVisit.findMany({
      where: {
        restaurantId,
        endTime: { gte: since },
        visitStatus: "COMPLETED",
      },
      orderBy: { endTime: "desc" },
      take: 30,
      select: { customerName: true, endTime: true, closedByStaffName: true },
    }),
  ]);

  type Event = { at: Date; text: string; kind: string };
  const events: Event[] = [];

  for (const l of staffLogs) {
    const label = l.action === "LOGIN" ? "سجّل دخول" : "سجّل خروج";
    events.push({
      at: l.createdAt,
      kind: "staff",
      text: `${l.staffName || "موظف"} ${label}.`,
    });
  }

  for (const a of sessionAudits) {
    if (a.field === "customerName" && a.newValue) {
      events.push({
        at: a.createdAt,
        kind: "customer",
        text: `${a.staffName || "موظف"} سجّل عميل ${a.newValue}.`,
      });
    } else if (a.field === "tableNumber" || a.field === "tableId") {
      events.push({
        at: a.createdAt,
        kind: "table",
        text: `${a.staffName || "موظف"} عيّن طاولة ${a.newValue || "—"}.`,
      });
    } else if (a.field === "status" && a.newValue === "COMPLETED") {
      events.push({
        at: a.createdAt,
        kind: "session",
        text: `${a.staffName || "موظف"} أغلق الجلسة.`,
      });
    }
  }

  for (const a of assignments) {
    events.push({
      at: a.createdAt,
      kind: "table",
      text: `${a.staffName || "موظف"} نقل/عيّن طاولة.`,
    });
  }

  for (const o of orders) {
    events.push({
      at: o.createdAt,
      kind: "kitchen",
      text: `المطبخ قبل الطلب #${o.orderNumber}.`,
    });
  }

  for (const v of visits) {
    if (v.endTime) {
      events.push({
        at: v.endTime,
        kind: "exit",
        text: `العميل ${v.customerName} غادر${v.closedByStaffName ? ` (${v.closedByStaffName})` : ""}.`,
      });
    }
  }

  return events
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit)
    .map((e) => ({
      at: e.at.toISOString(),
      time: e.at.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      text: e.text,
      kind: e.kind,
    }));
}

export async function searchMonitoring(
  restaurantId: string,
  q: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }
) {
  const term = q.trim();
  if (!term) return { visits: [], sessions: [], reservations: [], staff: [] };

  const businessConfig = await getRestaurantBusinessDayConfig(restaurantId);
  const { from, to } = resolveDateRange(
    "custom",
    filters?.dateFrom,
    filters?.dateTo,
    businessConfig
  );

  const [visits, sessions, reservations, staff] = await Promise.all([
    prisma.customerVisit.findMany({
      where: {
        restaurantId,
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
        OR: [
          { customerName: { contains: term, mode: "insensitive" } },
          { customerPhone: { contains: term } },
          ...(Number.isFinite(Number(term))
            ? [{ tableNumber: Number(term) }]
            : []),
        ],
        ...(filters?.status ? { visitStatus: filters.status as never } : {}),
      },
      take: 30,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tableSession.findMany({
      where: {
        restaurantId,
        OR: [
          { customerName: { contains: term, mode: "insensitive" } },
          { customerPhone: { contains: term } },
          { staffMemberName: { contains: term, mode: "insensitive" } },
          ...(Number.isFinite(Number(term)) ? [{ tableNumber: Number(term) }] : []),
        ],
      },
      take: 30,
      orderBy: { startedAt: "desc" },
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        OR: [
          { customerName: { contains: term, mode: "insensitive" } },
          { customerPhone: { contains: term } },
          { id: { contains: term } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.staff.findMany({
      where: {
        restaurantId,
        name: { contains: term, mode: "insensitive" },
      },
      take: 10,
    }),
  ]);

  return { visits, sessions, reservations, staff };
}

export async function getImmutableAuditFeed(restaurantId: string, limit = 100) {
  const [audit, sessionAudit, staffActivity] = await Promise.all([
    prisma.auditLog.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.sessionAuditLog.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.staffActivityLog.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  type Row = {
    id: string;
    source: string;
    action: string;
    detail: string;
    actor: string | null;
    at: string;
  };

  const rows: Row[] = [
    ...audit.map((a) => ({
      id: a.id,
      source: "audit",
      action: a.action,
      detail: a.entity ? `${a.entity}${a.entityId ? ` #${a.entityId.slice(0, 8)}` : ""}` : "",
      actor: a.userId,
      at: a.createdAt.toISOString(),
    })),
    ...sessionAudit.map((s) => ({
      id: s.id,
      source: "session",
      action: "SESSION_EDIT",
      detail: `${s.field}: ${s.oldValue ?? "—"} → ${s.newValue ?? "—"}`,
      actor: s.staffName,
      at: s.createdAt.toISOString(),
    })),
    ...staffActivity.map((s) => ({
      id: s.id,
      source: "staff",
      action: s.action,
      detail: s.staffName ?? "",
      actor: s.staffName,
      at: s.createdAt.toISOString(),
    })),
  ];

  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export async function evaluateOwnerAlerts(restaurantId: string, branchId?: string) {
  const settings = await getMonitoringSettings(restaurantId);
  const stats = await getMonitoringStats(restaurantId, branchId);
  const live = await getLiveCustomers(restaurantId, branchId);
  const alerts: { type: string; title: string; message: string }[] = [];

  for (const c of live) {
    if (
      c.status === "WAITING" &&
      c.waitingMinutes >= (settings.maxWaitMinutes ?? DEFAULT_MONITORING_SETTINGS.maxWaitMinutes!)
    ) {
      alerts.push({
        type: "LONG_WAIT",
        title: "انتظار طويل",
        message: `${c.customerName} ينتظر ${c.waitingMinutes} دقيقة`,
      });
    }
    if (
      c.sessionMinutes >=
      (settings.maxSessionMinutes ?? DEFAULT_MONITORING_SETTINGS.maxSessionMinutes!)
    ) {
      alerts.push({
        type: "LONG_SESSION",
        title: "جلسة طويلة",
        message: `${c.customerName} — ${c.sessionMinutes} دقيقة على الطاولة ${c.tableNumber}`,
      });
    }
  }

  if (
    stats.occupancyRate >=
    (settings.maxOccupancyPercent ?? DEFAULT_MONITORING_SETTINGS.maxOccupancyPercent!)
  ) {
    alerts.push({
      type: "HIGH_OCCUPANCY",
      title: "إشغال مرتفع",
      message: `نسبة الإشغال ${stats.occupancyRate}%`,
    });
  }

  for (const a of alerts) {
    const exists = await prisma.ownerNotification.findFirst({
      where: {
        restaurantId,
        type: a.type,
        message: a.message,
        createdAt: { gte: new Date(Date.now() - 15 * 60000) },
      },
    });
    if (!exists) {
      await prisma.ownerNotification.create({
        data: { restaurantId, ...a },
      });
    }
  }

  return alerts;
}
