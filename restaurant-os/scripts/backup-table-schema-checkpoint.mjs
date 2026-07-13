#!/usr/bin/env node
/**
 * Backup checkpoint before table management migration (read-only export).
 * Usage: node scripts/backup-table-schema-checkpoint.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "tmp", "backups");

async function main() {
  mkdirSync(outDir, { recursive: true });
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.diningTable.findMany({
      select: {
        id: true,
        branchId: true,
        number: true,
        label: true,
        tableCode: true,
        isActive: true,
        sortOrder: true,
        floorZone: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const path = join(
      outDir,
      `tables-pre-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    writeFileSync(
      path,
      JSON.stringify({ checkpoint: "PRE_TABLE_MANAGEMENT_MIGRATION", count: tables.length, tables }, null, 2)
    );
    console.log(`Backup saved: ${path} (${tables.length} tables)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
