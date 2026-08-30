#!/usr/bin/env node
/**
 * Backfill permanent publicQrToken for tables missing one (additive, no deletes).
 * Usage:
 *   npx tsx scripts/backfill-table-qr-tokens.ts
 *   npx tsx scripts/backfill-table-qr-tokens.ts --restaurant=fabrika-mqkat9dw
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";
import { ensureTablePublicQrToken } from "../src/lib/permanent-qr";

loadMigrateEnv();
const prisma = new PrismaClient();

const slugArg = process.argv.find((a) => a.startsWith("--restaurant="));
const restaurantSlug = slugArg?.split("=")[1] || null;

async function main() {
  const where = restaurantSlug
    ? { branch: { restaurant: { slug: restaurantSlug } }, isArchived: false }
    : { isArchived: false };

  const tables = await prisma.diningTable.findMany({
    where: { ...where, publicQrToken: null },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });

  console.log(`Tables missing token: ${tables.length}${restaurantSlug ? ` (${restaurantSlug})` : ""}`);

  let created = 0;
  for (const table of tables) {
    const token = await ensureTablePublicQrToken(table.id);
    console.log(`  table ${table.number} → ${token}`);
    created++;
  }

  const total = await prisma.diningTable.count({
    where: { ...where, publicQrToken: { not: null } },
  });

  console.log(`\nDone. Tokens created this run: ${created}. Total with token: ${total}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
