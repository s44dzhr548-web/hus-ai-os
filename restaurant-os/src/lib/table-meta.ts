import type { TableIcon, DiningTable } from "@prisma/client";
import prisma from "@/lib/prisma";
import { tableCodeFor, menuUrlForTable } from "@/lib/table-code";
import {
  displayTableNumber,
  normalizeTableNumber,
  numericTableNumber,
  TABLE_DUPLICATE_ERROR_AR,
} from "@/lib/table-number-normalize";
import { findNormalizedTableConflict } from "@/lib/table-duplicates";

export const TABLE_ICONS: { id: TableIcon; label: string; emoji: string }[] = [
  { id: "REGULAR", label: "عادية", emoji: "🪑" },
  { id: "VIP", label: "VIP", emoji: "⭐" },
  { id: "FAMILY", label: "عائلات", emoji: "👨‍👩‍👧‍👦" },
  { id: "OUTDOOR", label: "خارجي", emoji: "🌿" },
  { id: "SOFA", label: "أريكة", emoji: "🛋️" },
  { id: "WINDOW", label: "نافذة", emoji: "🪟" },
  { id: "BIRTHDAY", label: "عيد ميلاد", emoji: "🎂" },
  { id: "BUSINESS", label: "اجتماع عمل", emoji: "💼" },
  { id: "PRIVATE_ROOM", label: "غرفة خاصة", emoji: "🚪" },
];

export const TABLE_ICON_MAP = Object.fromEntries(
  TABLE_ICONS.map((i) => [i.id, i])
) as Record<TableIcon, (typeof TABLE_ICONS)[number]>;

export function tableIconEmoji(icon?: string | null) {
  if (!icon) return "🪑";
  return TABLE_ICON_MAP[icon as TableIcon]?.emoji ?? "🪑";
}

export type ManualTableInput = {
  number: number | string;
  label?: string | null;
  tableIcon?: TableIcon | string | null;
  zone?: string | null;
  capacity?: number;
  minimumSpendAmount?: number | null;
  notes?: string | null;
  sortOrder?: number;
};

function parseTableIdentifier(raw: string | number): {
  numeric: number | null;
  display: string;
  normalized: string;
} {
  const display = displayTableNumber(raw);
  const normalized = normalizeTableNumber(raw);
  const numeric = numericTableNumber(normalized);
  return { numeric, display, normalized };
}

async function nextManualTableNumber(branchId: string): Promise<number> {
  const last = await prisma.diningTable.findFirst({
    where: { branchId, number: { gte: 9000 } },
    orderBy: { number: "desc" },
  });
  return last ? last.number + 1 : 9000;
}

export function serializeTableMeta(table: Pick<
  DiningTable,
  "id" | "number" | "label" | "tableIcon" | "capacity" | "floorZone" | "minimumSpendAmount" | "sortOrder" | "notes"
>) {
  return {
    id: table.id,
    number: table.number,
    label: table.label,
    tableIcon: table.tableIcon,
    tableIconEmoji: tableIconEmoji(table.tableIcon),
    capacity: table.capacity,
    zone: table.floorZone,
    minimumSpendAmount:
      table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null,
    sortOrder: table.sortOrder,
    notes: table.notes,
  };
}

export function sessionTableMeta(session: {
  tableNumber: number;
  tableLabel?: string | null;
  tableIcon?: TableIcon | string | null;
  tableZone?: string | null;
  tableCapacity?: number | null;
  minimumSpendAmount?: unknown;
}) {
  return {
    number: session.tableNumber,
    label: session.tableLabel,
    tableIcon: session.tableIcon,
    tableIconEmoji: tableIconEmoji(session.tableIcon as string),
    zone: session.tableZone,
    capacity: session.tableCapacity,
    minimumSpendAmount:
      session.minimumSpendAmount != null
        ? Number(session.minimumSpendAmount)
        : null,
  };
}

export async function upsertManualTable(
  restaurantId: string,
  branchId: string,
  input: ManualTableInput
) {
  const { numeric, display, normalized } = parseTableIdentifier(input.number);
  if (!display || !normalized) throw new Error("رقم الطاولة غير صالح");

  let existing = await prisma.diningTable.findFirst({
    where: { branchId, normalizedNumber: normalized, isArchived: false },
  });

  if (!existing && numeric != null) {
    existing = await prisma.diningTable.findFirst({ where: { branchId, number: numeric } });
  }

  if (!existing) {
    const conflict = await findNormalizedTableConflict(branchId, normalized);
    if (conflict) throw new Error(TABLE_DUPLICATE_ERROR_AR);
  }

  if (!existing) {
    existing = await prisma.diningTable.findFirst({
      where: {
        branchId,
        OR: [{ label: display }, { tableCode: display.toLowerCase().replace(/\s+/g, "-") }],
      },
    });
  }

  const slug =
    (await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } }))
      ?.slug ?? "table";

  const icon = (input.tableIcon as TableIcon) || "REGULAR";
  const label = input.label?.trim() || display;
  const data = {
    label,
    displayNumber: display,
    normalizedNumber: normalized,
    tableIcon: icon,
    capacity: parseInt(String(input.capacity)) || 4,
    floorZone: input.zone?.trim() || null,
    minimumSpendAmount:
      input.minimumSpendAmount != null && String(input.minimumSpendAmount) !== ""
        ? parseFloat(String(input.minimumSpendAmount))
        : null,
    notes: input.notes?.trim() || null,
    sortOrder: input.sortOrder ?? (numeric ?? 9000),
    isActive: true,
  };

  const tableNumber = numeric ?? (existing?.number ?? (await nextManualTableNumber(branchId)));

  if (existing) {
    return prisma.diningTable.update({
      where: { id: existing.id },
      data,
    });
  }

  const code = tableCodeFor(slug, tableNumber);
  const table = await prisma.diningTable.create({
    data: { branchId, number: tableNumber, tableCode: code, ...data },
  });
  return prisma.diningTable.update({
    where: { id: table.id },
    data: { qrCode: menuUrlForTable(table.id, slug, code) },
  });
}

export async function checkReservationConflict(
  restaurantId: string,
  tableId: string,
  date: Date,
  excludeReservationId?: string
) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const conflict = await prisma.reservation.findFirst({
    where: {
      restaurantId,
      tableId,
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      status: { in: ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED", "CHECKED_IN", "SEATED"] },
      date: { gte: dayStart, lte: dayEnd },
    },
  });
  return conflict;
}

export function effectiveMinimumSpend(
  sessionAmount?: number | null,
  tableAmount?: number | null,
  reservationAmount?: number | null
) {
  if (sessionAmount != null && sessionAmount > 0) return sessionAmount;
  if (reservationAmount != null && reservationAmount > 0) return reservationAmount;
  if (tableAmount != null && tableAmount > 0) return tableAmount;
  return null;
}

export type TableSortKey = "number" | "zone" | "status" | "minimumSpend" | "capacity" | "sortOrder";

export function sortTableCards<T extends {
  table: { number: number; zone?: string | null; capacity?: number; minimumSpendAmount?: number | null; sortOrder?: number };
  status: string;
}>(cards: T[], sortBy: TableSortKey = "sortOrder"): T[] {
  const copy = [...cards];
  copy.sort((a, b) => {
    switch (sortBy) {
      case "zone":
        return (a.table.zone ?? "").localeCompare(b.table.zone ?? "");
      case "status":
        return a.status.localeCompare(b.status);
      case "minimumSpend":
        return (b.table.minimumSpendAmount ?? 0) - (a.table.minimumSpendAmount ?? 0);
      case "capacity":
        return (b.table.capacity ?? 0) - (a.table.capacity ?? 0);
      case "number":
        return a.table.number - b.table.number;
      default:
        return (a.table.sortOrder ?? a.table.number) - (b.table.sortOrder ?? b.table.number);
    }
  });
  return copy;
}
