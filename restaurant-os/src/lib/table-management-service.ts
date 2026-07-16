import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { tableCodeFor, menuUrlForTable } from "@/lib/table-code";
import { logTableAudit, tableSnapshot } from "@/lib/table-audit";
import {
  displayTableNumber,
  normalizeTableNumber,
  numericTableNumber,
  TABLE_DUPLICATE_ERROR_AR,
} from "@/lib/table-number-normalize";
import { findNormalizedTableConflict } from "@/lib/table-duplicates";

export async function getRestaurantSlug(restaurantId: string) {
  return (
    (await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } }))
      ?.slug ?? "table"
  );
}

export async function assertBranchOwned(branchId: string, restaurantId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId },
    select: { id: true },
  });
  if (!branch) throw new Error("الفرع غير موجود");
  return branch;
}

export async function assertTableOwned(tableId: string, restaurantId: string) {
  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, branch: { restaurantId } },
    include: { branch: { select: { restaurantId: true } } },
  });
  if (!table) throw new Error("الطاولة غير موجودة");
  return table;
}

export async function checkDuplicateTableNumber(
  branchId: string,
  number: number | string,
  excludeId?: string
) {
  const conflict = await findNormalizedTableConflict(branchId, number, excludeId);
  if (conflict) return conflict.table;

  const normalized = normalizeTableNumber(number);
  const numeric = typeof number === "number" ? number : numericTableNumber(normalized);
  if (numeric != null) {
    const existing = await prisma.diningTable.findFirst({
      where: {
        branchId,
        number: numeric,
        isArchived: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, number: true },
    });
    if (existing) return existing;
  }
  return null;
}

function tableNumberFields(raw: number | string) {
  const display = displayTableNumber(raw);
  const normalized = normalizeTableNumber(raw);
  const numeric = typeof raw === "number" ? raw : numericTableNumber(normalized);
  return { display, normalized, numeric };
}

export async function getTableWarnings(tableId: string, restaurantId: string) {
  const [activeOrders, upcomingReservations, activeSession] = await Promise.all([
    prisma.order.count({
      where: {
        tableId,
        branch: { restaurantId },
        status: { in: [OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY] },
      },
    }),
    prisma.reservation.count({
      where: {
        tableId,
        restaurantId,
        status: { in: ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED"] },
        date: { gte: new Date() },
      },
    }),
    prisma.tableSession.count({
      where: { tableId, endedAt: null },
    }),
  ]);

  return {
    activeOrders,
    upcomingReservations,
    activeSession,
    hasWarnings: activeOrders > 0 || upcomingReservations > 0 || activeSession > 0,
  };
}

export async function regenerateTableQr(
  tableId: string,
  slug: string,
  number: number,
  customCode?: string | null
) {
  const code = customCode?.trim() || tableCodeFor(slug, number);
  const qrCode = menuUrlForTable(tableId, slug, code);
  return prisma.diningTable.update({
    where: { id: tableId },
    data: { tableCode: code, qrCode },
  });
}

export async function createManagedTable(
  restaurantId: string,
  userId: string,
  data: {
    branchId: string;
    number: number | string;
    label?: string;
    capacity?: number;
    floorZone?: string | null;
    tableCode?: string | null;
  }
) {
  await assertBranchOwned(data.branchId, restaurantId);
  const fields = tableNumberFields(data.number);
  if (!fields.normalized) throw new Error("رقم الطاولة غير صالح");

  const dup = await checkDuplicateTableNumber(data.branchId, fields.normalized);
  if (dup) throw new Error(TABLE_DUPLICATE_ERROR_AR);

  const tableNum = fields.numeric ?? (await nextFallbackNumber(data.branchId));

  const slug = await getRestaurantSlug(restaurantId);
  const maxSort = await prisma.diningTable.aggregate({
    where: { branchId: data.branchId, isArchived: false },
    _max: { sortOrder: true },
  });

  const table = await prisma.diningTable.create({
    data: {
      branchId: data.branchId,
      number: tableNum,
      displayNumber: fields.display,
      normalizedNumber: fields.normalized,
      label: data.label || `طاولة ${fields.display}`,
      capacity: data.capacity ?? 4,
      floorZone: data.floorZone || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      tableCode: data.tableCode || tableCodeFor(slug, tableNum),
    },
  });

  const updated = await regenerateTableQr(table.id, slug, tableNum, table.tableCode);
  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_CREATE",
    tableId: updated.id,
    next: tableSnapshot(updated),
  });
  return updated;
}

async function nextFallbackNumber(branchId: string) {
  const last = await prisma.diningTable.findFirst({
    where: { branchId, number: { gte: 9000 } },
    orderBy: { number: "desc" },
  });
  return last ? last.number + 1 : 9000;
}

export async function updateManagedTable(
  restaurantId: string,
  userId: string,
  tableId: string,
  patch: {
    number?: number | string;
    label?: string;
    capacity?: number;
    floorZone?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    tableCode?: string | null;
    notes?: string | null;
    tableIcon?: string;
    floorMapX?: number;
    floorMapY?: number;
    minimumSpendAmount?: number | null;
  }
) {
  const existing = await assertTableOwned(tableId, restaurantId);
  const before = tableSnapshot(existing);

  if (patch.number != null && String(patch.number) !== String(existing.number)) {
    const dup = await checkDuplicateTableNumber(existing.branchId, patch.number, tableId);
    if (dup) throw new Error(TABLE_DUPLICATE_ERROR_AR);
  }

  const slug = await getRestaurantSlug(restaurantId);
  const fields =
    patch.number != null ? tableNumberFields(patch.number) : null;
  const newNumber = fields?.numeric ?? existing.number;
  const newCode =
    patch.tableCode !== undefined
      ? patch.tableCode || tableCodeFor(slug, newNumber)
      : patch.number != null
        ? tableCodeFor(slug, newNumber)
        : undefined;

  const updated = await prisma.diningTable.update({
    where: { id: tableId },
    data: {
      number: fields?.numeric ?? (typeof patch.number === "number" ? patch.number : undefined),
      displayNumber: fields?.display,
      normalizedNumber: fields?.normalized,
      label: patch.label ?? (fields ? `طاولة ${fields.display}` : undefined),
      capacity: patch.capacity,
      floorZone: patch.floorZone,
      isActive: patch.isActive,
      sortOrder: patch.sortOrder,
      notes: patch.notes,
      tableIcon: patch.tableIcon as never,
      floorMapX: patch.floorMapX,
      floorMapY: patch.floorMapY,
      minimumSpendAmount: patch.minimumSpendAmount,
      ...(newCode ? { tableCode: newCode } : {}),
    },
  });

  const withQr =
    newCode || patch.number != null
      ? await regenerateTableQr(updated.id, slug, newNumber, updated.tableCode)
      : updated;

  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_UPDATE",
    tableId,
    previous: before,
    next: tableSnapshot(withQr),
  });
  return withQr;
}

export async function archiveManagedTable(
  restaurantId: string,
  userId: string,
  tableId: string,
  force = false
) {
  const existing = await assertTableOwned(tableId, restaurantId);
  const warnings = await getTableWarnings(tableId, restaurantId);
  if (warnings.hasWarnings && !force) {
    throw new Error(
      `لا يمكن أرشفة الطاولة: ${warnings.activeOrders} طلب نشط، ${warnings.upcomingReservations} حجز، ${warnings.activeSession} جلسة مفتوحة`
    );
  }

  const archived = await prisma.diningTable.update({
    where: { id: tableId },
    data: { isArchived: true, archivedAt: new Date(), isActive: false },
  });

  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_ARCHIVE",
    tableId,
    previous: tableSnapshot(existing),
    next: tableSnapshot(archived),
    metadata: { warnings },
  });
  return archived;
}

export async function restoreManagedTable(restaurantId: string, userId: string, tableId: string) {
  const existing = await assertTableOwned(tableId, restaurantId);
  const dup = await checkDuplicateTableNumber(existing.branchId, existing.number, tableId);
  if (dup) {
    throw new Error(`رقم ${existing.number} مستخدم — غيّر الرقم قبل الاستعادة`);
  }

  const restored = await prisma.diningTable.update({
    where: { id: tableId },
    data: { isArchived: false, archivedAt: null, isActive: true },
  });

  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_RESTORE",
    tableId,
    previous: tableSnapshot(existing),
    next: tableSnapshot(restored),
  });
  return restored;
}

export async function duplicateManagedTable(restaurantId: string, userId: string, tableId: string) {
  const source = await assertTableOwned(tableId, restaurantId);
  const last = await prisma.diningTable.findFirst({
    where: { branchId: source.branchId, isArchived: false },
    orderBy: { number: "desc" },
  });
  const nextNumber = (last?.number ?? source.number) + 1;

  return createManagedTable(restaurantId, userId, {
    branchId: source.branchId,
    number: nextNumber,
    label: source.label ? `${source.label} (نسخة)` : `طاولة ${nextNumber}`,
    capacity: source.capacity,
    floorZone: source.floorZone,
  });
}

export async function renumberBranchTables(
  restaurantId: string,
  userId: string,
  branchId: string
) {
  await assertBranchOwned(branchId, restaurantId);
  const slug = await getRestaurantSlug(restaurantId);

  const tables = await prisma.diningTable.findMany({
    where: { branchId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
  });

  const changes: Array<{ id: string; from: number; to: number }> = [];

  for (let i = 0; i < tables.length; i++) {
    const newNumber = i + 1;
    const table = tables[i];
    if (table.number === newNumber) continue;

    changes.push({ id: table.id, from: table.number, to: newNumber });

    const code = tableCodeFor(slug, newNumber);
    await prisma.diningTable.update({
      where: { id: table.id },
      data: {
        number: newNumber,
        tableCode: code,
        qrCode: menuUrlForTable(table.id, slug, code),
        sortOrder: i,
      },
    });
  }

  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_RENUMBER",
    metadata: { branchId, changes, count: changes.length },
  });

  return prisma.diningTable.findMany({
    where: { branchId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
  });
}

export async function bulkTableAction(
  restaurantId: string,
  userId: string,
  action: "delete" | "enable" | "disable" | "move",
  ids: string[],
  payload?: { floorZone?: string; force?: boolean }
) {
  const results: unknown[] = [];
  for (const id of ids) {
    try {
      if (action === "delete") {
        results.push(await archiveManagedTable(restaurantId, userId, id, payload?.force));
      } else if (action === "enable") {
        results.push(await updateManagedTable(restaurantId, userId, id, { isActive: true }));
      } else if (action === "disable") {
        results.push(await updateManagedTable(restaurantId, userId, id, { isActive: false }));
      } else if (action === "move") {
        results.push(
          await updateManagedTable(restaurantId, userId, id, {
            floorZone: payload?.floorZone ?? null,
          })
        );
      }
    } catch (e) {
      results.push({ id, error: e instanceof Error ? e.message : "failed" });
    }
  }

  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_BULK",
    metadata: { action, ids, payload, resultsCount: results.length },
  });

  return results;
}

export function exportTablesCsv(
  tables: Array<{
    number: number;
    label?: string | null;
    tableCode?: string | null;
    capacity: number;
    floorZone?: string | null;
    isActive: boolean;
    qrCode?: string | null;
  }>
) {
  const header = "number,label,tableCode,capacity,area,isActive,qrUrl";
  const rows = tables.map((t) =>
    [
      t.number,
      JSON.stringify(t.label ?? ""),
      t.tableCode ?? "",
      t.capacity,
      t.floorZone ?? "",
      t.isActive,
      t.qrCode ?? "",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export async function importTablesFromRows(
  restaurantId: string,
  userId: string,
  branchId: string,
  rows: Array<{ number: number; label?: string; capacity?: number; area?: string }>
) {
  const created = [];
  for (const row of rows) {
    if (!row.number) continue;
    const dup = await checkDuplicateTableNumber(branchId, row.number);
    if (dup) continue;
    created.push(
      await createManagedTable(restaurantId, userId, {
        branchId,
        number: row.number,
        label: row.label,
        capacity: row.capacity,
        floorZone: row.area,
      })
    );
  }
  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_IMPORT",
    metadata: { branchId, imported: created.length },
  });
  return created;
}

export async function regenerateAllBranchQr(restaurantId: string, userId: string, branchId: string) {
  await assertBranchOwned(branchId, restaurantId);
  const slug = await getRestaurantSlug(restaurantId);
  const tables = await prisma.diningTable.findMany({
    where: { branchId, isArchived: false },
  });
  const updated = [];
  for (const t of tables) {
    const row = await regenerateTableQr(t.id, slug, t.number, t.tableCode);
    updated.push(row);
  }
  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_QR_REGENERATE",
    metadata: { branchId, count: updated.length, scope: "all" },
  });
  return updated;
}

export async function regenerateOneTableQr(
  restaurantId: string,
  userId: string,
  tableId: string
) {
  const table = await assertTableOwned(tableId, restaurantId);
  const slug = await getRestaurantSlug(restaurantId);
  const updated = await regenerateTableQr(table.id, slug, table.number, table.tableCode);
  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_QR_REGENERATE",
    tableId,
    previous: tableSnapshot(table),
    next: tableSnapshot(updated),
  });
  return updated;
}

export async function updateFloorPositions(
  restaurantId: string,
  userId: string,
  positions: Array<{ id: string; floorMapX: number; floorMapY: number }>
) {
  const updated = [];
  for (const p of positions) {
    const table = await assertTableOwned(p.id, restaurantId);
    const row = await prisma.diningTable.update({
      where: { id: p.id },
      data: { floorMapX: Math.round(p.floorMapX), floorMapY: Math.round(p.floorMapY) },
    });
    updated.push(row);
  }
  await logTableAudit({
    restaurantId,
    userId,
    action: "TABLE_UPDATE",
    metadata: { floorPositions: positions.length },
  });
  return updated;
}

export async function createBulkBackupSnapshot(
  restaurantId: string,
  branchId: string,
  tableIds: string[]
) {
  const tables = await prisma.diningTable.findMany({
    where: { id: { in: tableIds }, branch: { restaurantId }, branchId },
  });
  return {
    branchId,
    timestamp: new Date().toISOString(),
    tables: tables.map(tableSnapshot),
  };
}

export async function getTablePreviewDetail(tableId: string, restaurantId: string) {
  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, branch: { restaurantId } },
    include: {
      branch: { select: { name: true, nameAr: true } },
      _count: { select: { orders: true, reservations: true, tableSessions: true } },
      tableSessions: {
        where: { endedAt: null },
        take: 1,
        select: {
          id: true,
          customerName: true,
          guestCount: true,
          status: true,
          startedAt: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customerName: true,
        },
      },
      reservations: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 5,
        select: {
          id: true,
          customerName: true,
          date: true,
          status: true,
          guestCount: true,
        },
      },
    },
  });
  if (!table) return null;

  const lastVisit = await prisma.customerVisit.findFirst({
    where: { restaurantId, tableNumber: table.number },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, customerName: true, totalBill: true },
  });

  return { ...table, lastVisit };
}
