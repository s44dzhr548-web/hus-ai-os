import prisma from "@/lib/prisma";
import { resolveDateRange } from "@/lib/customer-history";
import {
  AUDIT_ACTION_LABELS_AR,
  STAFF_AUDIT_ACTIONS,
} from "@/lib/staff-audit-event";
import {
  computeDurationMinutes,
  formatDurationMinutes,
  formatRiyadhDate,
  formatRiyadhDateTime,
  formatRiyadhTime,
  LEGACY_UNAVAILABLE,
} from "@/lib/timezone";
import type { Prisma } from "@prisma/client";

export type StaffActivityScope = "all" | "self";

export function canViewAllStaffActivity(role?: string | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function resolveStaffActivityScope(
  role?: string | null,
  requestedUserId?: string | null,
  sessionUserId?: string | null
): { allowed: boolean; scope: StaffActivityScope; userId?: string } {
  if (canViewAllStaffActivity(role)) {
    return { allowed: true, scope: "all", userId: requestedUserId ?? undefined };
  }
  if (role === "RECEPTION" && sessionUserId) {
    if (requestedUserId && requestedUserId !== sessionUserId) {
      return { allowed: false, scope: "self" };
    }
    return { allowed: true, scope: "self", userId: sessionUserId };
  }
  return { allowed: false, scope: "self" };
}

async function loadStaffNames(restaurantId: string, userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, string>();

  const [users, staff] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    }),
    prisma.staff.findMany({
      where: { restaurantId, userId: { in: ids }, isActive: true },
      select: { userId: true, name: true, role: true },
    }),
  ]);

  const map = new Map<string, string>();
  for (const u of users) map.set(u.id, u.name || u.email);
  for (const s of staff) {
    if (s.userId) map.set(s.userId, s.name);
  }
  return map;
}

export async function getStaffActivitySummary(
  restaurantId: string,
  opts?: {
    from?: Date;
    to?: Date;
    scopeUserId?: string;
  }
) {
  const dateFilter =
    opts?.from || opts?.to
      ? {
          createdAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {};

  const staffFilter = opts?.scopeUserId
    ? { staffUserId: opts.scopeUserId }
    : {};

  const [staffList, auditEvents, loginLogs, visits] = await Promise.all([
    prisma.staff.findMany({
      where: {
        restaurantId,
        isActive: true,
        ...(opts?.scopeUserId ? { userId: opts.scopeUserId } : {}),
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.staffAuditEvent.findMany({
      where: { restaurantId, ...dateFilter, ...staffFilter },
      select: {
        staffUserId: true,
        action: true,
        createdAt: true,
        customerVisitId: true,
        metadata: true,
      },
    }),
    prisma.staffActivityLog.findMany({
      where: {
        restaurantId,
        action: { in: ["LOGIN", "LOGOUT"] },
        ...(opts?.scopeUserId ? { userId: opts.scopeUserId } : {}),
        ...dateFilter,
      },
      select: {
        userId: true,
        action: true,
        createdAt: true,
        loginSuccess: true,
        sessionDurationMinutes: true,
      },
    }),
    prisma.customerVisit.findMany({
      where: {
        restaurantId,
        ...(opts?.scopeUserId
          ? {
              OR: [
                { registeredByUserId: opts.scopeUserId },
                { assignedByUserId: opts.scopeUserId },
                { startedByUserId: opts.scopeUserId },
                { closedByUserId: opts.scopeUserId },
              ],
            }
          : {}),
        ...(opts?.from || opts?.to
          ? {
              enteredAt: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      },
      select: {
        registeredByUserId: true,
        assignedByUserId: true,
        startedByUserId: true,
        closedByUserId: true,
        guestCount: true,
        sessionDurationMinutes: true,
        sessionStartedAt: true,
        sessionEndedAt: true,
      },
    }),
  ]);

  const byUser = new Map<
    string,
    {
      registered: number;
      tablesAssigned: number;
      sessionsStarted: number;
      sessionsClosed: number;
      reservationsCreated: number;
      edits: number;
      firstActivity?: Date;
      lastActivity?: Date;
      totalGuests: number;
      durationSum: number;
      durationCount: number;
      loginMinutes: number;
    }
  >();

  function ensure(userId: string) {
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        registered: 0,
        tablesAssigned: 0,
        sessionsStarted: 0,
        sessionsClosed: 0,
        reservationsCreated: 0,
        edits: 0,
        totalGuests: 0,
        durationSum: 0,
        durationCount: 0,
        loginMinutes: 0,
      });
    }
    return byUser.get(userId)!;
  }

  function touch(userId: string | null | undefined, at: Date) {
    if (!userId) return;
    const row = ensure(userId);
    if (!row.firstActivity || at < row.firstActivity) row.firstActivity = at;
    if (!row.lastActivity || at > row.lastActivity) row.lastActivity = at;
  }

  for (const e of auditEvents) {
    if (!e.staffUserId) continue;
    const row = ensure(e.staffUserId);
    touch(e.staffUserId, e.createdAt);
    switch (e.action) {
      case "CUSTOMER_REGISTERED":
        row.registered++;
        break;
      case "TABLE_ASSIGNED":
      case "TABLE_CHANGED":
        row.tablesAssigned++;
        break;
      case "SESSION_STARTED":
        row.sessionsStarted++;
        break;
      case "SESSION_COMPLETED":
        row.sessionsClosed++;
        break;
      case "RESERVATION_CREATED":
        row.reservationsCreated++;
        break;
      case "CUSTOMER_UPDATED":
      case "SESSION_UPDATED":
      case "RESERVATION_UPDATED":
      case "ORDER_UPDATED":
        row.edits++;
        break;
    }
  }

  for (const v of visits) {
    if (v.registeredByUserId) {
      const row = ensure(v.registeredByUserId);
      row.totalGuests += v.guestCount;
    }
    const closer = v.closedByUserId;
    if (closer && v.sessionDurationMinutes != null) {
      const row = ensure(closer);
      row.durationSum += v.sessionDurationMinutes;
      row.durationCount++;
    } else if (v.sessionStartedAt && v.sessionEndedAt) {
      const uid = v.closedByUserId ?? v.startedByUserId;
      if (uid) {
        const mins = computeDurationMinutes(v.sessionStartedAt, v.sessionEndedAt);
        if (mins != null) {
          const row = ensure(uid);
          row.durationSum += mins;
          row.durationCount++;
        }
      }
    }
  }

  for (const log of loginLogs) {
    if (!log.userId) continue;
    touch(log.userId, log.createdAt);
    if (log.sessionDurationMinutes) {
      ensure(log.userId).loginMinutes += log.sessionDurationMinutes;
    }
  }

  return staffList.map((s) => {
    const uid = s.userId;
    const stats = byUser.get(uid) ?? {
      registered: 0,
      tablesAssigned: 0,
      sessionsStarted: 0,
      sessionsClosed: 0,
      reservationsCreated: 0,
      edits: 0,
      totalGuests: 0,
      durationSum: 0,
      durationCount: 0,
      loginMinutes: 0,
    };
    const avgDuration =
      stats.durationCount > 0
        ? Math.round(stats.durationSum / stats.durationCount)
        : null;

    return {
      userId: uid,
      name: s.name || s.user?.name || "—",
      email: s.user?.email ?? "—",
      role: s.role,
      customersRegistered: stats.registered,
      tablesAssigned: stats.tablesAssigned,
      sessionsStarted: stats.sessionsStarted,
      sessionsClosed: stats.sessionsClosed,
      reservationsCreated: stats.reservationsCreated,
      editsPerformed: stats.edits,
      firstActivity: stats.firstActivity?.toISOString() ?? null,
      lastActivity: stats.lastActivity?.toISOString() ?? null,
      firstActivityDisplay: stats.firstActivity
        ? formatRiyadhDateTime(stats.firstActivity)
        : LEGACY_UNAVAILABLE,
      lastActivityDisplay: stats.lastActivity
        ? formatRiyadhDateTime(stats.lastActivity)
        : LEGACY_UNAVAILABLE,
      totalGuests: stats.totalGuests,
      avgSessionDurationMinutes: avgDuration,
      avgSessionDurationDisplay: formatDurationMinutes(avgDuration),
      loginHours: stats.loginMinutes > 0 ? Math.round(stats.loginMinutes / 60) : 0,
    };
  });
}

export async function getStaffUserTimeline(
  restaurantId: string,
  userId: string,
  opts?: { from?: Date; to?: Date; limit?: number }
) {
  const where: Prisma.StaffAuditEventWhereInput = {
    restaurantId,
    staffUserId: userId,
    ...(opts?.from || opts?.to
      ? {
          createdAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
  };

  const events = await prisma.staffAuditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 300,
  });

  const visitIds = events.map((e) => e.customerVisitId).filter(Boolean) as string[];
  const visits =
    visitIds.length > 0
      ? await prisma.customerVisit.findMany({
          where: { id: { in: visitIds } },
          select: { id: true, customerName: true, tableDisplayNumber: true, tableNumber: true },
        })
      : [];
  const visitMap = new Map(visits.map((v) => [v.id, v]));

  return events.map((e) => {
    const visit = e.customerVisitId ? visitMap.get(e.customerVisitId) : null;
    return {
      id: e.id,
      action: e.action,
      actionLabel: AUDIT_ACTION_LABELS_AR[e.action] ?? e.action,
      date: formatRiyadhDate(e.createdAt),
      time: formatRiyadhTime(e.createdAt),
      timestamp: e.createdAt.toISOString(),
      customerName: visit?.customerName ?? null,
      table:
        visit?.tableDisplayNumber ??
        (visit?.tableNumber != null ? String(visit.tableNumber) : null),
      reservationId: e.reservationId,
      orderId: e.orderId,
      sessionId: e.sessionId,
      previousValue: e.previousValue,
      newValue: e.newValue,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      result: e.result,
    };
  });
}

export async function getLoginHistoryRows(
  restaurantId: string,
  opts?: {
    from?: Date;
    to?: Date;
    userId?: string;
    limit?: number;
  }
) {
  const logs = await prisma.staffActivityLog.findMany({
    where: {
      restaurantId,
      action: { in: ["LOGIN", "LOGOUT", "LOGIN_FAILED"] },
      ...(opts?.userId ? { userId: opts.userId } : {}),
      ...(opts?.from || opts?.to
        ? {
            createdAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 500,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  const loginSessions: {
    userId: string;
    userName: string;
    loginAt: Date;
    logoutAt?: Date;
    loginSuccess: boolean;
    failureReason?: string | null;
    endReason?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    sessionDurationMinutes?: number | null;
  }[] = [];

  const pendingLogin = new Map<string, (typeof loginSessions)[0]>();

  for (const log of [...logs].reverse()) {
    const userId = log.userId ?? "unknown";
    const userName = log.staffName || log.user?.name || log.user?.email || "—";

    if (log.action === "LOGIN" || log.action === "LOGIN_FAILED") {
      const row = {
        userId,
        userName,
        loginAt: log.createdAt,
        loginSuccess: log.loginSuccess !== false && log.action === "LOGIN",
        failureReason: log.failureReason,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      };
      loginSessions.push(row);
      if (log.action === "LOGIN") pendingLogin.set(userId, row);
    } else if (log.action === "LOGOUT") {
      const open = pendingLogin.get(userId);
      if (open) {
        open.logoutAt = log.createdAt;
        open.endReason = log.endReason ?? "USER_LOGOUT";
        open.sessionDurationMinutes =
          log.sessionDurationMinutes ??
          computeDurationMinutes(open.loginAt, log.createdAt);
        pendingLogin.delete(userId);
      } else {
        loginSessions.push({
          userId,
          userName,
          loginAt: log.createdAt,
          logoutAt: log.createdAt,
          loginSuccess: true,
          endReason: log.endReason ?? "USER_LOGOUT",
          sessionDurationMinutes: log.sessionDurationMinutes,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        });
      }
    }
  }

  return loginSessions.reverse().map((s) => ({
    userId: s.userId,
    userName: s.userName,
    loginDate: formatRiyadhDate(s.loginAt),
    loginTime: formatRiyadhTime(s.loginAt),
    logoutDate: s.logoutAt ? formatRiyadhDate(s.logoutAt) : LEGACY_UNAVAILABLE,
    logoutTime: s.logoutAt ? formatRiyadhTime(s.logoutAt) : LEGACY_UNAVAILABLE,
    sessionDurationDisplay: formatDurationMinutes(s.sessionDurationMinutes),
    sessionDurationMinutes: s.sessionDurationMinutes,
    device: parseDevice(s.userAgent),
    browser: parseBrowser(s.userAgent),
    ipAddress: s.ipAddress ?? LEGACY_UNAVAILABLE,
    loginSuccess: s.loginSuccess,
    failureReason: s.failureReason ?? null,
    endReason: s.endReason ?? null,
  }));
}

function parseDevice(ua?: string | null): string {
  if (!ua) return LEGACY_UNAVAILABLE;
  if (/mobile|android|iphone|ipad/i.test(ua)) return "جوال";
  return "سطح المكتب";
}

function parseBrowser(ua?: string | null): string {
  if (!ua) return LEGACY_UNAVAILABLE;
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Firefox/i.test(ua)) return "Firefox";
  return "أخرى";
}

export async function getAuditLogRows(
  restaurantId: string,
  opts?: {
    from?: Date;
    to?: Date;
    action?: string;
    staffUserId?: string;
    limit?: number;
  }
) {
  const events = await prisma.staffAuditEvent.findMany({
    where: {
      restaurantId,
      ...(opts?.action && opts.action !== "all" ? { action: opts.action } : {}),
      ...(opts?.staffUserId ? { staffUserId: opts.staffUserId } : {}),
      ...(opts?.from || opts?.to
        ? {
            createdAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 500,
  });

  const staffIds = events.map((e) => e.staffUserId).filter(Boolean) as string[];
  const names = await loadStaffNames(restaurantId, staffIds);

  return events.map((e) => ({
    id: e.id,
    action: e.action,
    actionLabel: AUDIT_ACTION_LABELS_AR[e.action] ?? e.action,
    staffName: e.staffName ?? (e.staffUserId ? names.get(e.staffUserId) : null) ?? "—",
    staffUserId: e.staffUserId,
    timestamp: e.createdAt.toISOString(),
    date: formatRiyadhDate(e.createdAt),
    time: formatRiyadhTime(e.createdAt),
    previousValue: e.previousValue,
    newValue: e.newValue,
    result: e.result,
    ipAddress: e.ipAddress,
  }));
}

export async function buildVisitReports(
  restaurantId: string,
  from?: Date,
  to?: Date
) {
  const where: Prisma.CustomerVisitWhereInput = {
    restaurantId,
    visitStatus: { notIn: ["CANCELLED", "NO_SHOW"] },
    NOT: { customerName: { contains: "Register QA", mode: "insensitive" } },
    ...(from || to
      ? {
          OR: [
            { enteredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } },
            { arrivalTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } },
          ],
        }
      : {}),
  };

  const visits = await prisma.customerVisit.findMany({
    where,
    select: {
      enteredAt: true,
      exitedAt: true,
      sessionDurationMinutes: true,
      tableNumber: true,
      tableDisplayNumber: true,
      branchId: true,
    },
    take: 5000,
  });

  const entriesByDate = new Map<string, number>();
  const exitsByDate = new Map<string, number>();
  const entryHours = new Map<number, number>();
  const exitHours = new Map<number, number>();
  const byTable = new Map<string, number>();
  const byBranch = new Map<string, number>();
  let durationSum = 0;
  let durationCount = 0;

  for (const v of visits) {
    if (v.enteredAt) {
      const d = formatRiyadhDate(v.enteredAt);
      entriesByDate.set(d, (entriesByDate.get(d) ?? 0) + 1);
      const hour = new Date(
        v.enteredAt.toLocaleString("en-US", { timeZone: "Asia/Riyadh" })
      ).getHours();
      entryHours.set(hour, (entryHours.get(hour) ?? 0) + 1);
    }
    if (v.exitedAt) {
      const d = formatRiyadhDate(v.exitedAt);
      exitsByDate.set(d, (exitsByDate.get(d) ?? 0) + 1);
      const hour = new Date(
        v.exitedAt.toLocaleString("en-US", { timeZone: "Asia/Riyadh" })
      ).getHours();
      exitHours.set(hour, (exitHours.get(hour) ?? 0) + 1);
    }
    if (v.sessionDurationMinutes != null) {
      durationSum += v.sessionDurationMinutes;
      durationCount++;
    }
    const tableKey =
      v.tableDisplayNumber ?? (v.tableNumber != null ? String(v.tableNumber) : "—");
    byTable.set(tableKey, (byTable.get(tableKey) ?? 0) + 1);
    if (v.branchId) byBranch.set(v.branchId, (byBranch.get(v.branchId) ?? 0) + 1);
  }

  const peakEntry = [...entryHours.entries()].sort((a, b) => b[1] - a[1])[0];
  const peakExit = [...exitHours.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    customersEnteredByDate: Object.fromEntries(entriesByDate),
    customersExitedByDate: Object.fromEntries(exitsByDate),
    avgSessionDurationMinutes:
      durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    peakEntryHour: peakEntry?.[0] ?? null,
    peakExitHour: peakExit?.[0] ?? null,
    customersByTable: Object.fromEntries(byTable),
    customersByBranch: Object.fromEntries(byBranch),
  };
}

export { STAFF_AUDIT_ACTIONS, resolveDateRange };
