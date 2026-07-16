import prisma from "@/lib/prisma";
import { isActiveSession, RESERVATION_STATUS_LABELS } from "@/lib/reception";
import type { ReservationStatus } from "@prisma/client";
import {
  currentBusinessDate,
  getBusinessDayRange,
  DEFAULT_BUSINESS_DAY_CONFIG,
} from "@/lib/business-day";

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
  tableId: string | null;
  tableNumberSnapshot: string | null;
  tableLabel: string | null;
  arrivedAt: string | null;
  checkedInAt: string | null;
  assignedAt: string | null;
  activeSessionId: string | null;
  currentVisitId: string | null;
  reservationId: string;
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
  if (status === "CHECKED_IN" || tableId) return "checked_in";
  return "arrived";
}

export async function fetchPresentGuests(restaurantId: string, branchId?: string | null) {
  const { dayStart, dayEnd } = todayBounds();

  const rows = await prisma.reservation.findMany({
    where: {
      restaurantId,
      ...(branchId ? { branchId } : {}),
      date: { gte: dayStart, lte: dayEnd },
      status: { in: RECEPTION_ACTIVE_STATUSES },
    },
    include: {
      tableSession: true,
      table: { select: { id: true, label: true, number: true } },
    },
    orderBy: [{ arrivedAt: "asc" }, { time: "asc" }],
  });

  const present: PresentGuestRow[] = [];

  for (const r of rows) {
    const session = r.tableSession;
    const sessionActive = session ? isActiveSession(session) : false;

    if ((r.status === "CONVERTED" || r.status === "SEATED") && !sessionActive) {
      continue;
    }

    if (r.status === "CONFIRMED" || r.status === "APPROVED") {
      if (!r.arrivedAt && !r.checkedInAt) continue;
    }

    const displaySection = sectionForStatus(r.status, sessionActive, r.tableId);
    const statusLabel = sessionActive
      ? "على الطاولة"
      : RECEPTION_STATUS_LABELS_AR[r.status] || r.status;

    present.push({
      id: r.id,
      reservationId: r.id,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      guestCount: r.guestCount,
      status: sessionActive ? "ACTIVE" : r.status,
      statusLabel,
      displaySection,
      tableId: r.tableId,
      tableNumberSnapshot:
        r.tableNumberSnapshot ||
        r.tableLabel ||
        (r.tableNumber != null ? String(r.tableNumber) : null),
      tableLabel: r.tableLabel,
      arrivedAt: r.arrivedAt?.toISOString() ?? null,
      checkedInAt: r.checkedInAt?.toISOString() ?? null,
      assignedAt: r.assignedAt?.toISOString() ?? null,
      activeSessionId: r.activeSessionId ?? session?.id ?? null,
      currentVisitId: r.currentVisitId ?? null,
    });
  }

  return present;
}
