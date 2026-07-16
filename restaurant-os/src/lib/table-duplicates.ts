import prisma from "@/lib/prisma";
import { normalizeTableNumber, displayTableNumber, TABLE_DUPLICATE_ERROR_AR } from "@/lib/table-number-normalize";

export type TableDuplicateRow = {
  tableId: string;
  branchId: string;
  branchName: string;
  displayNumber: string;
  normalizedNumber: string;
  activeOrders: number;
  reservations: number;
  sessions: number;
  hasQr: boolean;
};

export type DuplicateGroup = {
  normalizedNumber: string;
  branchId: string;
  branchName: string;
  tables: TableDuplicateRow[];
};

export async function findNormalizedTableConflict(
  branchId: string,
  rawNumber: string | number,
  excludeId?: string
) {
  const normalized = normalizeTableNumber(rawNumber);
  if (!normalized) return null;

  const existing = await prisma.diningTable.findFirst({
    where: {
      branchId,
      normalizedNumber: normalized,
      isArchived: false,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { branch: { select: { name: true, nameAr: true } } },
  });

  return existing
    ? {
        table: existing,
        normalized,
        message: TABLE_DUPLICATE_ERROR_AR,
        displayConflict: existing.displayNumber || existing.label || String(existing.number),
      }
    : null;
}

export async function buildTableDuplicateReport(restaurantId: string): Promise<{
  groups: DuplicateGroup[];
  totalDuplicateTables: number;
}> {
  const tables = await prisma.diningTable.findMany({
    where: { branch: { restaurantId }, isArchived: false },
    include: { branch: { select: { id: true, name: true, nameAr: true } } },
    orderBy: [{ branchId: "asc" }, { number: "asc" }],
  });

  const byKey = new Map<string, typeof tables>();
  for (const t of tables) {
    const norm =
      t.normalizedNumber ||
      normalizeTableNumber(t.displayNumber || t.label || t.number);
    if (!norm) continue;
    const key = `${t.branchId}:${norm}`;
    const list = byKey.get(key) || [];
    list.push(t);
    byKey.set(key, list);
  }

  const groups: DuplicateGroup[] = [];

  for (const [, list] of byKey) {
    if (list.length < 2) continue;
    const branchName = list[0].branch.nameAr || list[0].branch.name;
    const rows: TableDuplicateRow[] = [];

    for (const t of list) {
      const [activeOrders, reservations, sessions] = await Promise.all([
        prisma.order.count({
          where: {
            tableId: t.id,
            status: { in: ["NEW", "PREPARING", "READY"] },
          },
        }),
        prisma.reservation.count({
          where: {
            tableId: t.id,
            status: { in: ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED", "CHECKED_IN", "SEATED", "CONVERTED"] },
          },
        }),
        prisma.tableSession.count({
          where: { tableId: t.id, endedAt: null },
        }),
      ]);

      rows.push({
        tableId: t.id,
        branchId: t.branchId,
        branchName,
        displayNumber: t.displayNumber || t.label || String(t.number),
        normalizedNumber: t.normalizedNumber || normalizeTableNumber(t.displayNumber || t.label || t.number),
        activeOrders,
        reservations,
        sessions,
        hasQr: Boolean(t.qrCode),
      });
    }

    groups.push({
      normalizedNumber: rows[0].normalizedNumber,
      branchId: list[0].branchId,
      branchName,
      tables: rows,
    });
  }

  return {
    groups,
    totalDuplicateTables: groups.reduce((s, g) => s + g.tables.length, 0),
  };
}

export function tableNumberFields(raw: string | number) {
  const display = displayTableNumber(raw);
  const normalized = normalizeTableNumber(raw);
  const numeric = /^\d+$/.test(normalized) ? parseInt(normalized, 10) : null;
  return { display, normalized, numeric };
}
