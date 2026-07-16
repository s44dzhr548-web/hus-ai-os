import prisma from "@/lib/prisma";
import type { Prisma, ReservationStatus, Reservation } from "@prisma/client";
import { formatRiyadhDate, formatRiyadhTime, formatRiyadhDateTime } from "@/lib/timezone";
import { REGISTER_STATUS_LABELS, SOURCE_LABELS } from "@/lib/reservation-labels";
import {
  addCalendarDays,
  currentBusinessDate,
  getBusinessDayRange,
  DEFAULT_BUSINESS_DAY_CONFIG,
} from "@/lib/business-day";

export const TERMINAL_STATUSES: ReservationStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
];

export const ACTIVE_STATUSES: ReservationStatus[] = [
  "PENDING",
  "APPROVED",
  "CONFIRMED",
  "ARRIVED",
  "CHECKED_IN",
  "SEATED",
  "CONVERTED",
];

export type ReservationQuery = {
  restaurantId: string;
  mode?: "active" | "history" | "all";
  q?: string;
  status?: string;
  quick?: string;
  branchId?: string;
  tableId?: string;
  source?: string;
  createdByUserId?: string;
  guestCount?: number;
  reservationDateFrom?: string;
  reservationDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function dayBoundsRiyadh(offsetDays = 0) {
  const config = DEFAULT_BUSINESS_DAY_CONFIG;
  const bd = currentBusinessDate(new Date(), config.timezone, config.businessDayStartHour);
  const targetBd = offsetDays === 0 ? bd : addCalendarDays(bd, offsetDays);
  const range = getBusinessDayRange({
    businessDate: targetBd,
    timezone: config.timezone,
    businessDayStartHour: config.businessDayStartHour,
  });
  return { start: range.startUtc, end: range.endUtc };
}

export function buildReservationWhere(q: ReservationQuery): Prisma.ReservationWhereInput {
  const where: Prisma.ReservationWhereInput = {
    restaurantId: q.restaurantId,
    archivedAt: null,
  };

  if (q.mode === "active") {
    where.status = { in: ACTIVE_STATUSES };
  } else if (q.mode === "history") {
    where.status = { in: TERMINAL_STATUSES };
  }

  if (q.status && q.status !== "all") {
    if (q.status === "CONFIRMED" || q.status === "PENDING_REVIEW") {
      where.status =
        q.status === "CONFIRMED"
          ? { in: ["CONFIRMED", "APPROVED"] }
          : { in: ["PENDING"] };
    } else if (q.status === "SEATED") {
      where.status = { in: ["SEATED", "CONVERTED", "CHECKED_IN"] };
    } else {
      where.status = q.status as ReservationStatus;
    }
  }

  if (q.quick) {
    const today = dayBoundsRiyadh(0);
    const tomorrow = dayBoundsRiyadh(1);
    const weekEnd = dayBoundsRiyadh(7);
    switch (q.quick) {
      case "today":
        where.date = { gte: today.start, lte: today.end };
        break;
      case "tomorrow":
        where.date = { gte: tomorrow.start, lte: tomorrow.end };
        break;
      case "week":
        where.date = { gte: today.start, lte: weekEnd.end };
        break;
      case "upcoming":
        where.date = { gte: today.start };
        where.status = { in: ACTIVE_STATUSES };
        break;
      case "arrived":
        where.status = { in: ["ARRIVED", "CHECKED_IN"] };
        break;
      case "seated":
        where.status = { in: ["SEATED", "CONVERTED"] };
        break;
      case "completed":
        where.status = "COMPLETED";
        break;
      case "cancelled":
        where.status = "CANCELLED";
        break;
      case "no_show":
        where.status = "NO_SHOW";
        break;
      case "pending":
        where.status = "PENDING";
        break;
      case "full":
        break;
      default:
        break;
    }
  }

  if (q.branchId) where.branchId = q.branchId;
  if (q.tableId) where.tableId = q.tableId;
  if (q.source) where.source = q.source;
  if (q.createdByUserId) where.createdByUserId = q.createdByUserId;
  if (q.guestCount) where.guestCount = q.guestCount;

  if (q.reservationDateFrom || q.reservationDateTo) {
    where.date = {
      ...(q.reservationDateFrom ? { gte: new Date(q.reservationDateFrom) } : {}),
      ...(q.reservationDateTo ? { lte: new Date(q.reservationDateTo) } : {}),
    };
  }

  if (q.createdFrom || q.createdTo) {
    where.createdAt = {
      ...(q.createdFrom ? { gte: new Date(q.createdFrom) } : {}),
      ...(q.createdTo ? { lte: new Date(q.createdTo) } : {}),
    };
  }

  if (q.q?.trim()) {
    const term = q.q.trim();
    where.OR = [
      { customerName: { contains: term, mode: "insensitive" } },
      { customerPhone: { contains: term } },
      { reservationNumber: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export function buildReservationOrderBy(
  sortBy?: string,
  sortDir: "asc" | "desc" = "asc"
): Prisma.ReservationOrderByWithRelationInput[] {
  switch (sortBy) {
    case "createdAt":
      return [{ createdAt: sortDir }];
    case "customerName":
      return [{ customerName: sortDir }];
    case "status":
      return [{ status: sortDir }];
    case "guestCount":
      return [{ guestCount: sortDir }];
    case "tableNumber":
      return [{ tableNumber: sortDir }];
    case "arrivedAt":
      return [{ arrivedAt: sortDir }];
    default:
      return [{ date: sortDir }, { time: sortDir }];
  }
}

type ReservationRow = Reservation & {
  branch?: { id: string; name: string; nameAr: string | null } | null;
  table?: { id: string; number: number; label: string | null; displayNumber: string | null } | null;
  tableSession?: { id: string; endedAt: Date | null; startedAt: Date } | null;
};

export function serializeRegisterRow(
  r: ReservationRow,
  staffNames: Map<string, string | null>
) {
  const tableDisplay =
    r.tableNumberSnapshot ||
    r.table?.displayNumber ||
    r.tableLabel ||
    (r.tableNumber != null ? String(r.tableNumber) : null);

  return {
    id: r.id,
    reservationNumber: r.reservationNumber || r.id.slice(-8).toUpperCase(),
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    guestCount: r.guestCount,
    reservationDate: r.date.toISOString(),
    reservationTime: r.time,
    reservationDateDisplay: formatRiyadhDate(r.date),
    reservationTimeDisplay: r.time,
    reservationDateTimeDisplay: `${formatRiyadhDate(r.date)} — ${r.time}`,
    createdAt: r.createdAt.toISOString(),
    createdDateDisplay: formatRiyadhDate(r.createdAt),
    createdTimeDisplay: formatRiyadhTime(r.createdAt),
    createdDateTimeDisplay: formatRiyadhDateTime(r.createdAt),
    source: r.source || "legacy",
    sourceLabel: SOURCE_LABELS[r.source || "legacy"] || r.source || "—",
    branchId: r.branchId,
    branchName: r.branch?.nameAr || r.branch?.name || null,
    tableId: r.tableId,
    tableDisplay,
    minimumSpendAmount: r.minimumSpendAmount != null ? Number(r.minimumSpendAmount) : null,
    depositAmount: r.depositAmount != null ? Number(r.depositAmount) : null,
    depositStatus: r.depositStatus,
    status: r.status,
    statusLabel: REGISTER_STATUS_LABELS[r.status] || r.status,
    confirmedAt: r.confirmedAt?.toISOString() ?? null,
    arrivedAt: r.arrivedAt?.toISOString() ?? null,
    seatedAt: r.seatedAt?.toISOString() ?? null,
    sessionEndedAt: r.sessionEndedAt?.toISOString() ?? r.completedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    noShowAt: r.noShowAt?.toISOString() ?? null,
    assignedAt: r.assignedAt?.toISOString() ?? null,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdByUserId ? staffNames.get(r.createdByUserId) ?? null : null,
    updatedByUserId: r.updatedByUserId,
    updatedByName: r.updatedByUserId ? staffNames.get(r.updatedByUserId) ?? null : null,
    assignedByUserId: r.assignedByUserId,
    assignedByName: r.assignedByUserId ? staffNames.get(r.assignedByUserId) ?? null : null,
    confirmedByUserId: r.confirmedByUserId,
    confirmedByName: r.confirmedByUserId ? staffNames.get(r.confirmedByUserId) ?? null : null,
    completedByUserId: r.completedByUserId,
    completedByName: r.completedByUserId ? staffNames.get(r.completedByUserId) ?? null : null,
    notes: r.notes,
    occasion: r.occasion,
    customerProfileId: r.customerProfileId,
    activeSessionId: r.activeSessionId,
  };
}

async function staffNameMap(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  if (!unique.length) return new Map<string, string | null>();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}

export async function queryReservations(q: ReservationQuery) {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, q.pageSize ?? 50));
  const where = buildReservationWhere(q);
  const orderBy = buildReservationOrderBy(q.sortBy, q.sortDir ?? "asc");

  const [total, rows] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, nameAr: true } },
        table: { select: { id: true, number: true, label: true, displayNumber: true } },
        tableSession: { select: { id: true, endedAt: true, startedAt: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const staffIds = rows.flatMap((r) => [
    r.createdByUserId,
    r.updatedByUserId,
    r.assignedByUserId,
    r.confirmedByUserId,
    r.completedByUserId,
  ]);
  const staffNames = await staffNameMap(staffIds);

  return {
    reservations: rows.map((r) => serializeRegisterRow(r, staffNames)),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}

export async function getReservationStats(restaurantId: string, branchId?: string) {
  const today = dayBoundsRiyadh(0);
  const base: Prisma.ReservationWhereInput = {
    restaurantId,
    archivedAt: null,
    ...(branchId ? { branchId } : {}),
  };

  const [
    todayCount,
    upcoming,
    pending,
    arrived,
    seated,
    completedToday,
    noShow,
    cancelled,
  ] = await Promise.all([
    prisma.reservation.count({
      where: { ...base, date: { gte: today.start, lte: today.end } },
    }),
    prisma.reservation.count({
      where: { ...base, date: { gte: today.start }, status: { in: ACTIVE_STATUSES } },
    }),
    prisma.reservation.count({ where: { ...base, status: "PENDING" } }),
    prisma.reservation.count({
      where: { ...base, status: { in: ["ARRIVED", "CHECKED_IN"] } },
    }),
    prisma.reservation.count({
      where: { ...base, status: { in: ["SEATED", "CONVERTED"] } },
    }),
    prisma.reservation.count({
      where: {
        ...base,
        status: "COMPLETED",
        completedAt: { gte: today.start, lte: today.end },
      },
    }),
    prisma.reservation.count({ where: { ...base, status: "NO_SHOW" } }),
    prisma.reservation.count({ where: { ...base, status: "CANCELLED" } }),
  ]);

  return {
    today: todayCount,
    upcoming,
    pending,
    arrived,
    seated,
    completedToday,
    noShow,
    cancelled,
  };
}

export async function nextReservationNumber(restaurantId: string) {
  const last = await prisma.reservation.findFirst({
    where: { restaurantId, reservationNumber: { startsWith: "R-" } },
    orderBy: { reservationNumber: "desc" },
    select: { reservationNumber: true },
  });
  const n = last?.reservationNumber
    ? parseInt(last.reservationNumber.replace(/\D/g, ""), 10) + 1
    : 1;
  return `R-${String(n).padStart(5, "0")}`;
}

export function exportReservationsCsv(
  rows: ReturnType<typeof serializeRegisterRow>[]
) {
  const headers = [
    "رقم الحجز",
    "العميل",
    "الجوال",
    "الضيوف",
    "موعد الحجز",
    "وقت الحجز",
    "تاريخ التسجيل",
    "وقت التسجيل",
    "المصدر",
    "الفرع",
    "الطاولة",
    "الحد الأدنى",
    "العربون",
    "الحالة",
    "وقت الوصول",
    "وقت الجلوس",
    "وقت إنهاء الجلسة",
    "ملاحظات",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.reservationNumber,
        r.customerName,
        r.customerPhone,
        r.guestCount,
        r.reservationDateDisplay,
        r.reservationTime,
        r.createdDateDisplay,
        r.createdTimeDisplay,
        r.sourceLabel,
        r.branchName,
        r.tableDisplay,
        r.minimumSpendAmount,
        r.depositStatus,
        r.statusLabel,
        r.arrivedAt ? formatRiyadhDateTime(r.arrivedAt) : "",
        r.seatedAt ? formatRiyadhDateTime(r.seatedAt) : "",
        r.sessionEndedAt ? formatRiyadhDateTime(r.sessionEndedAt) : "",
        r.notes,
      ]
        .map(esc)
        .join(",")
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function exportReservationsPrintHtml(
  rows: ReturnType<typeof serializeRegisterRow>[],
  title = "سجل الحجوزات"
) {
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const bodyRows = rows
    .map(
      (r) => `<tr>
        <td>${esc(r.reservationNumber)}</td>
        <td>${esc(r.customerName)}</td>
        <td dir="ltr">${esc(r.customerPhone)}</td>
        <td>${esc(r.guestCount)}</td>
        <td>${esc(r.reservationDateTimeDisplay)}</td>
        <td>${esc(r.createdDateTimeDisplay)}</td>
        <td>${esc(r.tableDisplay)}</td>
        <td>${esc(r.statusLabel)}</td>
        <td>${esc(r.arrivedAt ? formatRiyadhDateTime(r.arrivedAt) : "—")}</td>
        <td>${esc(r.seatedAt ? formatRiyadhDateTime(r.seatedAt) : "—")}</td>
        <td>${esc(r.sessionEndedAt ? formatRiyadhDateTime(r.sessionEndedAt) : "—")}</td>
        <td>${esc(r.createdByName)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; }
    th { background: #f3f4f6; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>تاريخ التصدير: ${esc(formatRiyadhDateTime(new Date()))}</p>
  <table>
    <thead>
      <tr>
        <th>رقم الحجز</th>
        <th>العميل</th>
        <th>الجوال</th>
        <th>الضيوف</th>
        <th>موعد الحجز</th>
        <th>التسجيل</th>
        <th>الطاولة</th>
        <th>الحالة</th>
        <th>الوصول</th>
        <th>الجلوس</th>
        <th>إنهاء الجلسة</th>
        <th>أنشأ</th>
      </tr>
    </thead>
    <tbody>${bodyRows || "<tr><td colspan='12'>لا توجد بيانات</td></tr>"}</tbody>
  </table>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}
