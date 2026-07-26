/**
 * Repair reservations that have check-in timestamps but wrong/missing status (no deletes).
 * Usage: npx tsx scripts/repair-reservation-checkin-state.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.reservation.findMany({
    where: {
      archivedAt: null,
      OR: [
        {
          checkedInAt: { not: null },
          status: { in: ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED"] },
        },
        {
          arrivedAt: { not: null },
          tableId: { not: null },
          status: { in: ["PENDING", "APPROVED", "CONFIRMED", "ARRIVED"] },
        },
      ],
    },
    select: { id: true, status: true, restaurantId: true, tableId: true },
  });

  let fixed = 0;
  for (const r of candidates) {
    const prev = r.status;
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: r.id },
        data: { status: "CHECKED_IN" },
      });
      await tx.reservationStatusHistory.create({
        data: {
          reservationId: r.id,
          previousStatus: prev,
          newStatus: "CHECKED_IN",
          note: "repair:checkin-state",
        },
      });
      await tx.reservationAuditLog.create({
        data: {
          restaurantId: r.restaurantId,
          reservationId: r.id,
          action: "RESERVATION_CHECK_IN_REPAIR",
          oldValues: { status: prev },
          newValues: { status: "CHECKED_IN", tableId: r.tableId },
        },
      });
    });
    fixed += 1;
  }

  console.log(JSON.stringify({ scanned: candidates.length, fixed }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
