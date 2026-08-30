import prisma from "@/lib/prisma";
import { isActiveSession, RESERVATION_STATUS_LABELS, finalizeTableSession } from "@/lib/reception";
import type { ReservationStatus } from "@prisma/client";
import {
  currentBusinessDate,
  getBusinessDayRange,
  DEFAULT_BUSINESS_DAY_CONFIG,
} from "@/lib/business-day";
import { formatRiyadhDateTime } from "@/lib/timezone";

export const RECEPTION_ACTIVE_STATUSES: ReservationStatus[] = [
  "CONFIRMED",
  "APPROVED",
  "ARRIVED",
  "CHECKED_IN",
  "SEATED",
  "CONVERTED",
];

export const RECEPTION_STATUS_LABELS_AR: Record<string, string> = {
  ...RESERVATION_STATUS_LABELS,
  CHECKED_IN: "تم تسجيل الدخول",
  SEATED: "جالس",
  ACTIVE: "على الطاولة",
};

export type PresentGuestRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  status: string;
  statusLabel: string;
  displaySection: "arrived" | "checked_in" | "seated";
  seatedLabel: string | null;
  tableId: string | null;
  tableNumberSnapshot: string | null;
  tableLabel: string | null;
  arrivedAt: string | null;
  checkedInAt: string | null;
  seatedAt: string | null;
  assignedAt: string | null;
  reservationDate: string | null;
  reservationTime: string | null;
  reservationNumber: string | null;
  confirmedByName: string | null;
  activeSessionId: string | null;
  currentVisitId: string | null;
  reservationId: string;
  sessionDurationMinutes: number | null;
};

function todayBounds() {
  const config = DEFAULT_BUSINESS_DAY_CONFIG;
  const bd = currentBusinessDate(new Date(), config.timezone, config.businessDayStartHour);
  const range = getBusinessDayRange({
    businessDate: bd,
    timezone: config.timezone,
    businessDayStartHour: config.businessDayStartHour,
  });
  return { dayStart: range.startUtc, dayEnd: range.endUtc };
}

function sectionForStatus(
  status: ReservationStatus,
  hasActiveSession: boolean,
  tableId: string | null
): PresentGuestRow["displaySection"] {
  if (hasActiveSession || status === "SEATED" || status === "CONVERTED") return "seated";
  if (status === "CHECKED_IN" || (status === "ARRIVED" && tableId)) return "checked_in";
  if (status === "ARRIVED") return "arrived";
  if (tableId && ["CONFIRMED", "APPROVED"].includes(status)) return "checked_in";
  return "arrived";
}

function sessionDurationMinutes(seatedAt: Date | null, sessionStartedAt: Date | null): number | null {
  const start = seatedAt ?? sessionStartedAt;
  if (!start) return null;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
}

export async function fetchPresentGuests(restaurantId: string, branchId?: string | null) {
  const { dayStart, dayEnd } = todayBounds();

  const rows = await prisma.reservation.findMany({
    where: {
      restaurantId,
      ...(branchId ? { branchId } : {}),
      status: { in: RECEPTION_ACTIVE_STATUSES },
      OR: [
        { date: { gte: dayStart, lte: dayEnd } },
        { arrivedAt: { gte: dayStart, lte: dayEnd } },
        { checkedInAt: { gte: dayStart, lte: dayEnd } },
        { seatedAt: { gte: dayStart, lte: dayEnd } },
        {
          status: { in: ["SEATED", "CHECKED_IN", "CONVERTED"] },
          activeSessionId: { not: null },
        },
      ],
    },
    include: {
      tableSession: true,
      table: { select: { id: true, label: true, number: true } },
    },
    orderBy: [{ seatedAt: "desc" }, { arrivedAt: "asc" }, { time: "asc" }],
  });

  const staffIds = [
    ...new Set(
      rows
        .map((r) => r.confirmedByUserId || r.assignedByUserId)
        .filter(Boolean) as string[]
    ),
  ];
  const staffNames = staffIds.length
    ? await prisma.user.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameByUserId = new Map(staffNames.map((u) => [u.id, u.name]));

  const present: PresentGuestRow[] = [];

  for (const r of rows) {
    const session = r.tableSession;
    const sessionActive = session ? isActiveSession(session) : false;

    if ((r.status === "CONFIRMED" || r.status === "APPROVED") && !r.arrivedAt && !r.checkedInAt) {
      continue;
    }

    if (r.status === "SEATED" && !sessionActive && !r.activeSessionId) {
      continue;
    }

    const tableDisplay =
      r.tableNumberSnapshot ||
      r.tableLabel ||
      (r.tableNumber != null ? String(r.tableNumber) : null) ||
      (r.table?.label || (r.table?.number != null ? String(r.table.number) : null));

    const displaySection = sectionForStatus(r.status, sessionActive, r.tableId);
    const statusLabel = sessionActive
      ? "جالس"
      : r.status === "SEATED"
        ? "تم الجلوس (الجلسة منتهية)"
        : RECEPTION_STATUS_LABELS_AR[r.status] || r.status;

    const seatedLabel =
      displaySection === "seated" && tableDisplay
        ? `جالس على الطاولة رقم ${tableDisplay}`
        : null;

    const confirmedBy =
      (r.assignedByUserId && nameByUserId.get(r.assignedByUserId)) ||
      (r.confirmedByUserId && nameByUserId.get(r.confirmedByUserId)) ||
      null;

    present.push({
      id: r.id,
      reservationId: r.id,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      guestCount: r.guestCount,
      status: sessionActive ? "ACTIVE" : r.status,
      statusLabel,
      displaySection,
      seatedLabel,
      tableId: r.tableId,
      tableNumberSnapshot: tableDisplay,
      tableLabel: r.tableLabel,
      arrivedAt: r.arrivedAt?.toISOString() ?? null,
      checkedInAt: r.checkedInAt?.toISOString() ?? null,
      seatedAt: r.seatedAt?.toISOString() ?? null,
      assignedAt: r.assignedAt?.toISOString() ?? null,
      reservationDate: r.date ? formatRiyadhDateTime(r.date).split(" ")[0] : null,
      reservationTime: r.time,
      reservationNumber: r.reservationNumber,
      confirmedByName: confirmedBy,
      activeSessionId: r.activeSessionId ?? session?.id ?? null,
      currentVisitId: r.currentVisitId ?? null,
      sessionDurationMinutes: sessionActive
        ? sessionDurationMinutes(r.seatedAt, session?.startedAt ?? null)
        : null,
    });
  }

  return present;
}

export async function completeReservationSession(
  reservationId: string,
  restaurantId: string,
  staff: { userId?: string; userName?: string }
) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId },
  });
  if (!reservation) throw new Error("الحجز غير موجود");
  if (!reservation.activeSessionId) {
    throw new Error("لا توجد جلسة نشطة لهذا الحجز");
  }
  const result = await finalizeTableSession(reservation.activeSessionId, {
    staffUserId: staff.userId,
    staffName: staff.userName,
  });
  if (!result) throw new Error("تعذّر إنهاء الجلسة");
  return result;
}
