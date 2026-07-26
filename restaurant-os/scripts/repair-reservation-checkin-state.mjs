/**
 * Repair reservations with check-in/arrival data but wrong status (no deletes).
 *
 * Default: dry run only.
 *
 * Usage:
 *   node scripts/repair-reservation-checkin-state.mjs
 *   node scripts/repair-reservation-checkin-state.mjs --apply
 *   node scripts/repair-reservation-checkin-state.mjs --apply --restaurant=slug-or-id
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_STATUS = "CHECKED_IN";
const WRONG_STATUSES = ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED"];

const apply = process.argv.includes("--apply");
const restaurantArg = process.argv.find((a) => a.startsWith("--restaurant="));
const restaurantFilter = restaurantArg ? restaurantArg.split("=")[1] : null;

function buildWhere(restaurantId) {
  return {
    archivedAt: null,
    ...(restaurantId ? { restaurantId } : {}),
    OR: [
      {
        checkedInAt: { not: null },
        status: { in: WRONG_STATUSES },
      },
      {
        arrivedAt: { not: null },
        tableId: { not: null },
        status: { in: WRONG_STATUSES },
      },
    ],
  };
}

async function resolveRestaurantId(filter) {
  if (!filter) return null;
  const bySlug = await prisma.restaurant.findFirst({
    where: { slug: filter },
    select: { id: true, slug: true, nameAr: true, name: true },
  });
  if (bySlug) return bySlug;
  const byId = await prisma.restaurant.findFirst({
    where: { id: filter },
    select: { id: true, slug: true, nameAr: true, name: true },
  });
  return byId;
}

async function main() {
  let restaurantId = null;
  let restaurantMeta = null;
  if (restaurantFilter) {
    restaurantMeta = await resolveRestaurantId(restaurantFilter);
    if (!restaurantMeta) {
      throw new Error(`Restaurant not found for filter: ${restaurantFilter}`);
    }
    restaurantId = restaurantMeta.id;
  }

  const candidates = await prisma.reservation.findMany({
    where: buildWhere(restaurantId),
    select: {
      id: true,
      status: true,
      restaurantId: true,
      tableId: true,
      checkedInAt: true,
      arrivedAt: true,
      customerName: true,
      reservationNumber: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const report = {
    mode: apply ? "apply" : "dry-run",
    restaurant: restaurantMeta
      ? {
          id: restaurantMeta.id,
          slug: restaurantMeta.slug,
          name: restaurantMeta.nameAr || restaurantMeta.name,
        }
      : null,
    affectedCount: candidates.length,
    targetStatus: TARGET_STATUS,
    reservations: candidates.map((r) => ({
      id: r.id,
      reservationNumber: r.reservationNumber,
      customerName: r.customerName,
      currentStatus: r.status,
      nextStatus: TARGET_STATUS,
      tableId: r.tableId,
      checkedInAt: r.checkedInAt?.toISOString() ?? null,
      arrivedAt: r.arrivedAt?.toISOString() ?? null,
    })),
    fixed: 0,
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (process.env.REPAIR_CONFIRM !== "yes") {
    console.error(
      JSON.stringify(
        {
          error: "Refusing --apply without REPAIR_CONFIRM=yes (run dry-run first, backup DB first)",
          affectedCount: candidates.length,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  let fixed = 0;
  for (const r of candidates) {
    const prev = r.status;
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: r.id },
        data: { status: TARGET_STATUS },
      });
      await tx.reservationStatusHistory.create({
        data: {
          reservationId: r.id,
          previousStatus: prev,
          newStatus: TARGET_STATUS,
          note: "repair:checkin-state",
        },
      });
      await tx.reservationAuditLog.create({
        data: {
          restaurantId: r.restaurantId,
          reservationId: r.id,
          action: "RESERVATION_CHECK_IN_REPAIR",
          oldValues: { status: prev },
          newValues: { status: TARGET_STATUS, tableId: r.tableId },
        },
      });
    });
    fixed += 1;
  }

  report.fixed = fixed;
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
