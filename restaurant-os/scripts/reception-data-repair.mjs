#!/usr/bin/env node
/**
 * Reception / reservation data repair — dry-run by default.
 * Usage:
 *   node scripts/reception-data-repair.mjs --dry-run --restaurant=fabrika-mqkat9dw
 *   node scripts/reception-data-repair.mjs --apply --restaurant=fabrika-mqkat9dw
 */
import { PrismaClient } from "@prisma/client";
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();
const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");
const slugArg = process.argv.find((a) => a.startsWith("--restaurant="));
const slug = slugArg?.split("=")[1] || "fabrika-mqkat9dw";

async function main() {
  const restaurant = await prisma.restaurant.findFirst({ where: { slug } });
  if (!restaurant) {
    console.error("Restaurant not found:", slug);
    process.exit(1);
  }
  const rid = restaurant.id;
  console.log(`\n=== Reception data repair (${dryRun ? "DRY RUN" : "APPLY"}) — ${slug} ===\n`);

  const report = {
    seatedWithoutTable: [],
    checkedInHidden: [],
    occupiedNoReservation: [],
    duplicateActiveOnTable: [],
    repairCandidates: [],
  };

  const activeStatuses = ["CONFIRMED", "APPROVED", "ARRIVED", "CHECKED_IN", "SEATED", "CONVERTED"];

  const reservations = await prisma.reservation.findMany({
    where: { restaurantId: rid, status: { in: activeStatuses } },
    include: { tableSession: true },
  });

  for (const r of reservations) {
    if (r.status === "SEATED" && !r.tableId) report.seatedWithoutTable.push(r.id);
    if (r.checkedInAt && !["SEATED", "CHECKED_IN", "CONVERTED", "ARRIVED"].includes(r.status)) {
      report.checkedInHidden.push(r.id);
    }
    if (
      r.checkedInAt &&
      r.tableId &&
      r.status !== "SEATED" &&
      r.status !== "COMPLETED" &&
      r.status !== "CANCELLED"
    ) {
      report.repairCandidates.push(r.id);
    }
  }

  const tables = await prisma.diningTable.findMany({
    where: { branch: { restaurantId: rid }, isArchived: false },
    select: { id: true, number: true, operationalStatus: true },
  });

  for (const t of tables) {
    if (t.operationalStatus === "OCCUPIED") {
      const active = await prisma.reservation.count({
        where: {
          restaurantId: rid,
          tableId: t.id,
          status: { in: ["SEATED", "CHECKED_IN", "CONVERTED"] },
          activeSessionId: { not: null },
        },
      });
      if (!active) report.occupiedNoReservation.push(`${t.number}:${t.id}`);
    }
    const dup = await prisma.tableSession.count({
      where: { tableId: t.id, endedAt: null, status: { not: "COMPLETED" } },
    });
    if (dup > 1) report.duplicateActiveOnTable.push(`${t.number}:${dup}`);
  }

  const numbers = tables.map((t) => t.number);
  const dupNums = numbers.filter((n, i) => numbers.indexOf(n) !== i);

  console.log(JSON.stringify({ ...report, duplicateTableNumbers: [...new Set(dupNums)] }, null, 2));

  if (!dryRun && report.repairCandidates.length) {
    let fixed = 0;
    for (const id of report.repairCandidates) {
      const r = await prisma.reservation.findUnique({ where: { id } });
      if (!r?.tableId || !r.checkedInAt) continue;
      const table = await prisma.diningTable.findFirst({
        where: { id: r.tableId, branch: { restaurantId: rid } },
      });
      if (!table) continue;
      await prisma.reservation.update({
        where: { id },
        data: {
          status: "SEATED",
          seatedAt: r.seatedAt ?? r.checkedInAt,
          tableNumberSnapshot:
            r.tableNumberSnapshot ?? String(table.displayNumber || table.number),
        },
      });
      await prisma.reservationAuditLog.create({
        data: {
          restaurantId: rid,
          reservationId: id,
          action: "DATA_REPAIR_SEATED",
          newValues: { dryRun: false, repair: "SEATED" },
        },
      });
      fixed++;
    }
    console.log("Repaired reservations:", fixed);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
