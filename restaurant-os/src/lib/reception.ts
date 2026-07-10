import prisma from "@/lib/prisma";
import type {
  TableSession,
  TableSessionStatus,
  TableOperationalStatus,
  ReservationStatus,
} from "@prisma/client";
import { tableIconEmoji } from "@/lib/table-meta";
import { formatSessionTableTitle } from "@/lib/session-edit";

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
  SEATED: "جلس",
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
  customerPhone?: string | null
) {
  if (!customerPhone) {
    return prisma.customerProfile.create({
      data: { restaurantId, customerName, customerPhone: null },
    });
  }

  const existing = await prisma.customerProfile.findFirst({
    where: { restaurantId, customerPhone },
  });

  if (existing) {
    return prisma.customerProfile.update({
      where: { id: existing.id },
      data: { customerName },
    });
  }

  return prisma.customerProfile.create({
    data: { restaurantId, customerName, customerPhone },
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
        closedByStaffName: closedBy?.staffName ?? tableSession.staffMemberName,
        arrivalTime: tableSession.startedAt,
        endTime: endedAt,
        totalBill: bill.currentBill,
        ordersCount: bill.orderCount,
        visitStatus: "COMPLETED",
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
    completedAt: r.completedAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    noShowAt: r.noShowAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function serializeCustomerVisit(v: {
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
  minimumSpendAmount?: unknown;
  previousTables?: unknown;
  closedByStaffName?: string | null;
  arrivalTime?: Date | null;
  endTime?: Date | null;
  totalBill?: unknown;
  ordersCount?: number;
  visitStatus?: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return {
    id: v.id,
    customerName: v.customerName,
    customerPhone: v.customerPhone ?? null,
    tableNumber: v.tableNumber ?? null,
    tableDisplayNumber: v.tableDisplayNumber ?? null,
    tableLabel: v.tableLabel ?? null,
    tableIcon: v.tableIcon ?? null,
    tableZone: v.tableZone ?? null,
    guestCount: v.guestCount,
    minimumSpendAmount:
      v.minimumSpendAmount != null ? Number(v.minimumSpendAmount) : null,
    previousTables: Array.isArray(v.previousTables) ? v.previousTables : [],
    closedByStaffName: v.closedByStaffName ?? null,
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
