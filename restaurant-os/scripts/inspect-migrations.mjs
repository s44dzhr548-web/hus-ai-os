#!/usr/bin/env node
/** Read-only: inspect live schema markers and _prisma_migrations (no writes). */
import { PrismaClient } from "@prisma/client";
import { assertDbEnv, listMigrationNames } from "./lib/load-migrate-env.mjs";

async function tableExists(db, table) {
  const rows = await db.$queryRaw`
    SELECT 1 AS ok FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table} LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(db, table, column) {
  const rows = await db.$queryRaw`
    SELECT 1 AS ok FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column} LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  assertDbEnv();
  const db = new PrismaClient();
  const migrations = listMigrationNames();

  try {
    const tableCount = await db.$queryRaw`
      SELECT COUNT(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    console.log(`[inspect] public tables: ${tableCount[0]?.n ?? 0}`);
    console.log(`[inspect] repo migrations: ${migrations.length}`);

    const markers = {
      restaurants: await tableExists(db, "restaurants"),
      platform_meta_config: await tableExists(db, "platform_meta_config"),
      restaurant_ai_access: await tableExists(db, "restaurant_ai_access"),
      whatsapp_access_token_enc: await columnExists(db, "platform_meta_config", "whatsapp_access_token_enc"),
    };
    console.log("[inspect] markers:", JSON.stringify(markers));

    let applied = [];
    try {
      applied = await db.$queryRaw`
        SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at NULLS LAST`;
    } catch {
      console.log("[inspect] _prisma_migrations: (table missing)");
    }
    console.log(`[inspect] applied migrations: ${applied.length}`);
    if (applied.length) {
      for (const row of applied.slice(0, 3)) console.log(`  first: ${row.migration_name}`);
      for (const row of applied.slice(-3)) console.log(`  last:  ${row.migration_name}`);
    }

    const pending = migrations.filter((m) => !applied.some((a) => a.migration_name === m));
    console.log(`[inspect] pending vs repo: ${pending.length}`);
    if (pending.length) pending.forEach((m) => console.log(`  pending: ${m}`));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
