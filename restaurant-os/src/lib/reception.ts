import prisma from "@/lib/prisma";
import type {
  TableSession,
  TableSessionStatus,
  TableOperationalStatus,
  ReservationStatus,
} from "@prisma/client";
import { tableIconEmoji } from "@/lib/table-meta";
import { formatSessionTableTitle } from "@/lib/session-edit";
import {
  formatDurationMinutes,
  formatRiyadhDate,
  formatRiyadhTime,
  LEGACY_UNAVAILABLE,
} from "@/lib/timezone";
import { onSessionCompleted } from "@/lib/visit-tracking";
import { triggerAfterVisitWhatsApp } from "@/lib/after-visit-whatsapp/service";

export const TABLE_SESSION_STATUSES: TableSessionStatus[] = [
  "WAITING",
  "SEATED",
  "ORDERING",
  "FOOD_PREPARING",
  "SERVING",
  "PAID",
  "COMPLETED",
];

export const TABLE_SESSION_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "متاحة",
  WAITING: "انتظار",
  SEATED: "جلس",
  ORDERING: "يطلب",
  FOOD_PREPARING: "تحضير",
  SERVING: "تقديم",
  PAID: "مدفوع",
  COMPLETED: "مكتمل",
};

export const TABLE_OPERATIONAL_STATUSES: TableOperationalStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "CLEANING",
  "OUT_OF_SERVICE",
];

export const TABLE_OPERATIONAL_LABELS: Record<TableOperationalStatus, string> = {
  AVAILABLE: "متاحة",
  RESERVED: "محجوزة",
  OCCUPIED: "مشغولة",
  CLEANING: "تنظيف",
  OUT_OF_SERVICE: "خارج الخدمة",
};

export const TABLE_OPERATIONAL_COLORS: Record<TableOperationalStatus, string> = {
  AVAILABLE: "bg-emerald-500",
  RESERVED: "bg-amber-400",
  OCCUPIED: "bg-red-500",
  CLEANING: "bg-blue-500",
  OUT_OF_SERVICE: "bg-gray-400",
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "مؤكد",
  CONFIRMED: "مؤكد",
  REJECTED: "مرفوض",
  ARRIVED: "وصل",
  CHECKED_IN: "تم الوصول",
  SEATED: "على الطاولة",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
  CONVERTED: "تحوّل لجلسة",
  NO_SHOW: "لم يحضر",
};

export const PREFERRED_AREAS = [
  { id: "INDOOR", label: "داخلي" },
  { id: "OUTDOOR", label: "خارجي" },
  { id: "VIP", label: "VIP" },
  { id: "FAMILY", label: "عائلات" },
  { id: "SMOKING", label: "تدخين" },
  { id: "NON_SMOKING", label: "بدون تدخين" },
];

export function isActiveSession(session: Pick<TableSession, "endedAt" | "status">) {
  return session.endedAt == null && session.status !== "COMPLETED";
}

export async function getActiveSessionForTable(tableId: string) {
  return prisma.tableSession.findFirst({
    where: {
      tableId,
      endedAt: null,
      status: { not: "COMPLETED" },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function syncTableOperationalStatus(tableId: string) {
  const [activeSession, upcomingReservation] = await Promise.all([
    getActiveSessionForTable(tableId),
    prisma.reservation.findFirst({
      where: {
        tableId,
        status: { in: ["PENDING", "APPROVED", "CONFIRMED"] },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  let status: TableOperationalStatus = "AVAILABLE";
  if (activeSession) status = "OCCUPIED";
  else if (upcomingReservation) status = "RESERVED";

  await prisma.diningTable.update({
    where: { id: tableId },
    data: { operationalStatus: status },
  });
  return status;
}

export async function upsertCustomerProfile(
  restaurantId: string,
  customerName: string,
  customerPhone?: string | null,
  marketingConsent?: boolean
) {
  const consentData =
    marketingConsent === true
      ? { marketingConsent: true, marketingConsentAt: new Date() }
      : marketingConsent === false
        ? { marketingConsent: false, marketingConsentAt: null }
        : {};

  if (!customerPhone) {
    return prisma.customerProfile.create({
      data: { restaurantId, customerName, customerPhone: null, ...consentData },
    });
  }

  const existing = await prisma.customerProfile.findFirst({
    where: { restaurantId, customerPhone },
  });

  if (existing) {
    return prisma.customerProfile.update({
      where: { id: existing.id },
      data: { customerName, ...consentData },
    });
  }

  return prisma.customerProfile.create({
    data: {
      restaurantId,
      customerName,
      customerPhone,
      marketingConsent: marketingConsent === true,
      marketingConsentAt: marketingConsent === true ? new Date() : null,
    },
  });
}

export async function recordCustomerVisitStats(
  profileId: string,
  spendAmount = 0,
  incrementVisit = true
) {
  try {
    await prisma.customerProfile.update({
      where: { id: profileId },
      data: {
        ...(incrementVisit ? { visitCount: { increment: 1 } } : {}),
        ...(spendAmount > 0 ? { totalSpending: { increment: spendAmount } } : {}),
        lastVisitAt: new Date(),
      },
    });
  } catch {
    /* extended columns optional until migration applied */
  }
}

/** Soft-close a table session and persist visit/reservation history */
export async function finalizeTableSession(
  sessionId: string,
  closedBy?: { staffName?: string | null; staffUserId?: string | null }
) {
  const tableSession = await prisma.tableSession.findUnique({
    where: { id: sessionId },
  });
  if (!tableSession) return null;

  if (tableSession.status === "COMPLETED" && tableSession.endedAt) {
    const bill = await getTableBill(tableSession.tableId, tableSession.startedAt);
    return { session: tableSession, bill };
  }

  const bill = await getTableBill(tableSession.tableId, tableSession.startedAt);
  const endedAt = new Date();

  const updated = await prisma.tableSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      endedAt,
      totalBill: bill.currentBill,
      ordersCount: bill.orderCount,
    },
  });

  if (tableSession.customerVisitId) {
    await onSessionCompleted({
      visitId: tableSession.customerVisitId,
      restaurantId: tableSession.restaurantId,
      branchId: tableSession.branchId,
      sessionId: tableSession.id,
      sessionStartedAt: tableSession.startedAt,
      staff: {
        userId: closedBy?.staffUserId,
        name: closedBy?.staffName ?? tableSession.staffMemberName,
      },
    });

    triggerAfterVisitWhatsApp({
      restaurantId: tableSession.restaurantId,
      branchId: tableSession.branchId,
      visitId: tableSession.customerVisitId,
      sessionId: tableSession.id,
    });

    await prisma.customerVisit.update({
      where: { id: tableSession.customerVisitId },
      data: {
        tableNumber: tableSession.tableNumber,
        tableDisplayNumber:
          tableSession.tableDisplayNumber ?? String(tableSession.tableNumber),
        tableLabel: tableSession.tableLabel ?? undefined,
        tableIcon: tableSession.tableIcon ?? undefined,
        tableZone: tableSession.tableZone ?? undefined,
        minimumSpendAmount: tableSession.minimumSpendAmount,
        arrivalTime: tableSession.startedAt,
        totalBill: bill.currentBill,
        ordersCount: bill.orderCount,
      },
    });

    const visit = await prisma.customerVisit.findUnique({
      where: { id: tableSession.customerVisitId },
    });
    if (visit?.customerProfileId) {
      await recordCustomerVisitStats(visit.customerProfileId, bill.currentBill, true);
    }
  }

  if (tableSession.reservationId) {
    await prisma.reservation.update({
      where: { id: tableSession.reservationId },
      data: { status: "COMPLETED", completedAt: endedAt },
    });
  }

  try {
    await syncTableOperationalStatus(tableSession.tableId);
  } catch {
    /* optional */
  }

  return { session: updated, bill };
}

export async function getCustomerHistory(
  restaurantId: string,
  customerPhone: string
) {
  const profile = await prisma.customerProfile.findFirst({
    where: { restaurantId, customerPhone },
  });
  if (!profile) return null;

  const isBirthdaySoon = profile.birthday
    ? isBirthdayWithinDays(profile.birthday, 7)
    : false;

  return {
    id: profile.id,
    customerName: profile.customerName,
    customerPhone: profile.customerPhone,
    gender: profile.gender,
    birthday: profile.birthday?.toISOString() ?? null,
    isVip: profile.isVip,
    visitCount: profile.visitCount,
    totalSpending: Number(profile.totalSpending),
    lastVisitAt: profile.lastVisitAt?.toISOString() ?? null,
    notes: profile.notes,
    isBirthdaySoon,
    vipBadge: profile.isVip || profile.visitCount >= 10,
  };
}

function isBirthdayWithinDays(birthday: Date, days: number) {
  const now = new Date();
  const bday = new Date(birthday);
  bday.setFullYear(now.getFullYear());
  if (bday < now) bday.setFullYear(now.getFullYear() + 1);
  const diff = (bday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export async function getTableBill(tableId: string, since?: Date) {
  const orders = await prisma.order.findMany({
    where: {
      tableId,
      ...(since ? { createdAt: { gte: since } } : {}),
      status: { not: "CANCELLED" },
    },
    include: { items: true, payments: true },
    orderBy: { createdAt: "asc" },
  });

  const subtotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const paid = orders.filter((o) =>
    o.payments.some((p) => p.status === "PAID")
  ).length;

  return {
    orderCount: orders.length,
    currentBill: subtotal,
    paidOrders: paid,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export function sessionDurationMinutes(startedAt: Date) {
  return Math.floor((Date.now() - startedAt.getTime()) / 60000);
}

export async function suggestBestTable(
  restaurantId: string,
  guestCount: number,
  branchId?: string | null,
  preferredArea?: string | null
) {
  const tables = await prisma.diningTable.findMany({
    where: {
      branch: { restaurantId },
      isActive: true,
      capacity: { gte: guestCount },
      ...(branchId ? { branchId } : {}),
    },
    orderBy: [{ capacity: "asc" }, { number: "asc" }],
  });

  for (const table of tables) {
    const active = await getActiveSessionForTable(table.id);
    if (active) continue;
    const conflict = await prisma.reservation.findFirst({
      where: {
        tableId: table.id,
        status: { in: ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED"] },
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });
    if (!conflict) return table;
  }

  return tables[0] ?? null;
}

export async function estimateWaitMinutes(restaurantId: string, branchId?: string) {
  const [waitingCount, availableTables] = await Promise.all([
    prisma.waitingListEntry.count({
      where: { restaurantId, status: "WAITING", ...(branchId ? { branchId } : {}) },
    }),
    prisma.diningTable.count({
      where: {
        branch: { restaurantId },
        operationalStatus: "AVAILABLE",
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
    }),
  ]);

  if (availableTables > 0) return 5;
  return Math.max(15, waitingCount * 12);
}

export async function createReceptionNotification(
  restaurantId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string
) {
  return prisma.receptionNotification.create({
    data: { restaurantId, type, title, message, entityType, entityId },
  });
}

export function serializeTableSession(session: TableSession & { currentBill?: number; durationMinutes?: number; ordersCount?: number | null }) {
  return {
    id: session.id,
    restaurantId: session.restaurantId,
    branchId: session.branchId,
    tableId: session.tableId,
    tableNumber: session.tableNumber,
    tableDisplayNumber: session.tableDisplayNumber ?? String(session.tableNumber),
    tableTitle: formatSessionTableTitle(session),
    tableLabel: session.tableLabel ?? null,
    tableIcon: session.tableIcon ?? null,
    tableIconEmoji: tableIconEmoji(session.tableIcon),
    tableZone: session.tableZone ?? null,
    tableCapacity: session.tableCapacity ?? null,
    customerVisitId: session.customerVisitId,
    reservationId: session.reservationId,
    customerName: session.customerName,
    customerPhone: session.customerPhone,
    guestCount: session.guestCount,
    minimumSpendAmount:
      session.minimumSpendAmount != null
        ? Number(session.minimumSpendAmount)
        : null,
    status: session.status,
    notes: session.notes,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    totalBill:
      session.totalBill != null
        ? Number(session.totalBill)
        : session.currentBill ?? 0,
    ordersCount: session.ordersCount ?? 0,
    durationMinutes:
      session.durationMinutes ?? sessionDurationMinutes(session.startedAt),
    currentBill: session.currentBill ?? (session.totalBill != null ? Number(session.totalBill) : 0),
  };
}

export function serializePublicSession(session: TableSession) {
  return {
    customerName: session.customerName,
    tableNumber: session.tableNumber,
    tableDisplayNumber: session.tableDisplayNumber ?? String(session.tableNumber),
    tableLabel: session.tableLabel ?? null,
    tableIcon: session.tableIcon ?? null,
    tableIconEmoji: tableIconEmoji(session.tableIcon),
    tableZone: session.tableZone ?? null,
    guestCount: session.guestCount,
    minimumSpendAmount:
      session.minimumSpendAmount != null
        ? Number(session.minimumSpendAmount)
        : null,
    status: session.status,
  };
}

export function serializeReservation(r: {
  id: string;
  restaurantId: string;
  branchId?: string | null;
  customerProfileId?: string | null;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  gender?: string | null;
  date: Date;
  time: string;
  occasion?: string | null;
  notes?: string | null;
  preferredArea?: string | null;
  tableId?: string | null;
  tableNumber?: number | null;
  tableLabel?: string | null;
  tableIcon?: string | null;
  tableZone?: string | null;
  minimumSpendAmount?: unknown;
  status: ReservationStatus;
  depositAmount?: unknown;
  depositStatus?: string | null;
  depositPaymentId?: string | null;
  arrivedAt?: Date | null;
  checkedInAt?: Date | null;
  tableNumberSnapshot?: string | null;
  assignedByUserId?: string | null;
  assignedAt?: Date | null;
  currentVisitId?: string | null;
  activeSessionId?: string | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  noShowAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    restaurantId: r.restaurantId,
    branchId: r.branchId ?? null,
    customerProfileId: r.customerProfileId ?? null,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    guestCount: r.guestCount,
    gender: r.gender ?? null,
    date: r.date.toISOString(),
    time: r.time,
    occasion: r.occasion ?? null,
    notes: r.notes ?? null,
    preferredArea: r.preferredArea ?? null,
    tableId: r.tableId ?? null,
    tableNumber: r.tableNumber ?? null,
    tableLabel: r.tableLabel ?? null,
    tableIcon: r.tableIcon ?? null,
    tableZone: r.tableZone ?? null,
    minimumSpendAmount:
      r.minimumSpendAmount != null ? Number(r.minimumSpendAmount) : null,
    status: r.status,
    depositAmount: r.depositAmount != null ? Number(r.depositAmount) : null,
    depositStatus: r.depositStatus ?? null,
    depositPaymentId: r.depositPaymentId ?? null,
    arrivedAt: r.arrivedAt?.toISOString() ?? null,
    checkedInAt: r.checkedInAt?.toISOString() ?? null,
    tableNumberSnapshot: r.tableNumberSnapshot ?? null,
    assignedAt: r.assignedAt?.toISOString() ?? null,
    assignedByUserId: r.assignedByUserId ?? null,
    currentVisitId: r.currentVisitId ?? null,
    activeSessionId: r.activeSessionId ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    noShowAt: r.noShowAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function serializeCustomerVisit(
  v: {
    id: string;
    restaurantId: string;
    customerProfileId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    guestCount: number;
    tableNumber?: number | null;
    tableDisplayNumber?: string | null;
    tableLabel?: string | null;
    tableIcon?: string | null;
    tableZone?: string | null;
    tableId?: string | null;
    branchId?: string | null;
    source?: string | null;
    minimumSpendAmount?: unknown;
    previousTables?: unknown;
    closedByStaffName?: string | null;
    enteredAt?: Date | null;
    registeredAt?: Date | null;
    seatedAt?: Date | null;
    sessionStartedAt?: Date | null;
    sessionEndedAt?: Date | null;
    exitedAt?: Date | null;
    sessionDurationMinutes?: number | null;
    visitDate?: Date | null;
    registeredByUserId?: string | null;
    assignedByUserId?: string | null;
    startedByUserId?: string | null;
    closedByUserId?: string | null;
    arrivalTime?: Date | null;
    endTime?: Date | null;
    totalBill?: unknown;
    ordersCount?: number;
    visitStatus?: string;
    notes?: string | null;
    createdAt: Date;
    updatedAt?: Date;
  },
  staffNames?: Map<string, string>
) {
  const staffLabel = (userId?: string | null, fallback?: string | null) => {
    if (userId && staffNames?.has(userId)) return staffNames.get(userId)!;
    if (fallback) return fallback;
    return LEGACY_UNAVAILABLE;
  };

  return {
    id: v.id,
    customerName: v.customerName,
    customerPhone: v.customerPhone ?? null,
    tableNumber: v.tableNumber ?? null,
    tableDisplayNumber: v.tableDisplayNumber ?? null,
    tableNumberSnapshot: v.tableDisplayNumber ?? (v.tableNumber != null ? String(v.tableNumber) : null),
    tableLabel: v.tableLabel ?? null,
    tableIcon: v.tableIcon ?? null,
    tableZone: v.tableZone ?? null,
    tableId: v.tableId ?? null,
    branchId: v.branchId ?? null,
    source: v.source ?? null,
    guestCount: v.guestCount,
    minimumSpendAmount:
      v.minimumSpendAmount != null ? Number(v.minimumSpendAmount) : null,
    previousTables: Array.isArray(v.previousTables) ? v.previousTables : [],
    closedByStaffName: v.closedByStaffName ?? null,
    enteredAt: v.enteredAt?.toISOString() ?? v.arrivalTime?.toISOString() ?? null,
    registeredAt: v.registeredAt?.toISOString() ?? null,
    seatedAt: v.seatedAt?.toISOString() ?? null,
    sessionStartedAt: v.sessionStartedAt?.toISOString() ?? null,
    sessionEndedAt: v.sessionEndedAt?.toISOString() ?? v.endTime?.toISOString() ?? null,
    exitedAt: v.exitedAt?.toISOString() ?? v.endTime?.toISOString() ?? null,
    sessionDurationMinutes: v.sessionDurationMinutes ?? null,
    visitDate: v.visitDate?.toISOString()?.slice(0, 10) ?? null,
    registeredByUserId: v.registeredByUserId ?? null,
    assignedByUserId: v.assignedByUserId ?? null,
    startedByUserId: v.startedByUserId ?? null,
    closedByUserId: v.closedByUserId ?? null,
    registeredByName: staffLabel(v.registeredByUserId),
    assignedByName: staffLabel(v.assignedByUserId),
    startedByName: staffLabel(v.startedByUserId),
    closedByName: staffLabel(v.closedByUserId, v.closedByStaffName),
    enteredAtDisplay: v.enteredAt || v.arrivalTime ? formatRiyadhTime(v.enteredAt ?? v.arrivalTime) : LEGACY_UNAVAILABLE,
    registeredAtDisplay: v.registeredAt ? formatRiyadhTime(v.registeredAt) : LEGACY_UNAVAILABLE,
    seatedAtDisplay: v.seatedAt ? formatRiyadhTime(v.seatedAt) : LEGACY_UNAVAILABLE,
    sessionStartedAtDisplay: v.sessionStartedAt ? formatRiyadhTime(v.sessionStartedAt) : LEGACY_UNAVAILABLE,
    sessionEndedAtDisplay: v.sessionEndedAt || v.endTime ? formatRiyadhTime(v.sessionEndedAt ?? v.endTime) : LEGACY_UNAVAILABLE,
    exitedAtDisplay: v.exitedAt || v.endTime ? formatRiyadhTime(v.exitedAt ?? v.endTime) : LEGACY_UNAVAILABLE,
    visitDateDisplay: v.visitDate || v.enteredAt || v.arrivalTime
      ? formatRiyadhDate(v.visitDate ?? v.enteredAt ?? v.arrivalTime ?? v.createdAt)
      : LEGACY_UNAVAILABLE,
    sessionDurationDisplay: formatDurationMinutes(v.sessionDurationMinutes),
    arrivalTime: v.arrivalTime?.toISOString() ?? v.createdAt.toISOString(),
    endTime: v.endTime?.toISOString() ?? null,
    totalBill: v.totalBill != null ? Number(v.totalBill) : 0,
    ordersCount: v.ordersCount ?? 0,
    visitStatus: v.visitStatus ?? "ACTIVE",
    notes: v.notes ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt?.toISOString() ?? v.createdAt.toISOString(),
  };
}

export function normalizeReservationStatus(
  status: ReservationStatus
): ReservationStatus {
  if (status === "APPROVED") return "CONFIRMED";
  return status;
}
