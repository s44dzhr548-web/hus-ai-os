#!/usr/bin/env node
/**
 * Baseline an existing Supabase/Postgres database for Prisma Migrate (P3005 fix).
 * Marks migrations already reflected in the live schema as applied — no DDL is executed.
 */
import { spawnSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import {
  assertDbEnv,
  listMigrationNames,
} from "./lib/load-migrate-env.mjs";

const MARKERS = [
  {
    migration: "20250721070000_platform_whatsapp_access_token",
    probe: (db) => columnExists(db, "platform_meta_config", "whatsapp_access_token_enc"),
  },
  {
    migration: "20250719050000_restaurant_ai_access",
    probe: (db) => tableExists(db, "restaurant_ai_access"),
  },
  {
    migration: "20250719030000_platform_ai_providers",
    probe: (db) => tableExists(db, "platform_ai_provider_connections"),
  },
  {
    migration: "20250718020000_ai_engineer_permissions",
    probe: (db) => tableExists(db, "ai_engineer_permission_grants"),
  },
  {
    migration: "20250718010000_ai_assistant",
    probe: (db) => tableExists(db, "ai_assistant_messages"),
  },
  {
    migration: "20250714060000_platform_meta_config",
    probe: (db) => tableExists(db, "platform_meta_config"),
  },
  {
    migration: "20250713220000_after_visit_whatsapp",
    probe: (db) => tableExists(db, "after_visit_whatsapp_automations"),
  },
  {
    migration: "20250711120000_marketing_ai",
    probe: (db) => tableExists(db, "marketing_ad_connections"),
  },
  {
    migration: "20250617000000_init",
    probe: (db) => tableExists(db, "restaurants"),
  },
];

async function tableExists(db, table) {
  const rows = await db.$queryRaw`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(db, table, column) {
  const rows = await db.$queryRaw`
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function getAppliedMigrations(db) {
  try {
    const rows = await db.$queryRaw`SELECT migration_name FROM _prisma_migrations`;
    return new Set(rows.map((row) => row.migration_name));
  } catch {
    return new Set();
  }
}

async function detectBaselineMigration(db, migrations) {
  for (const marker of MARKERS) {
    if (await marker.probe(db)) {
      return marker.migration;
    }
  }
  if (await tableExists(db, "restaurants")) {
    return migrations[0];
  }
  return null;
}

function runPrisma(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status === 0;
}

async function main() {
  assertDbEnv();
  const migrations = listMigrationNames();
  const db = new PrismaClient();

  try {
    const baselineUntil = await detectBaselineMigration(db, migrations);
    if (!baselineUntil) {
      console.error("[baseline] Could not detect schema state — aborting (no data loss).");
      process.exit(1);
    }

    const applied = await getAppliedMigrations(db);
    const toResolve = migrations.filter((name) => name <= baselineUntil && !applied.has(name));

    console.log(`[baseline] Detected live schema through: ${baselineUntil}`);
    console.log(`[baseline] Already recorded: ${applied.size}; to resolve: ${toResolve.length}`);

    if (toResolve.length === 0) {
      console.log("[baseline] Nothing to resolve — migration history matches schema.");
      return;
    }

    for (const name of toResolve) {
      console.log(`[baseline] prisma migrate resolve --applied ${name}`);
      if (!runPrisma(["migrate", "resolve", "--applied", name])) {
        process.exit(1);
      }
    }

    console.log("[baseline] Done.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("[baseline] failed:", err);
  process.exit(1);
});
