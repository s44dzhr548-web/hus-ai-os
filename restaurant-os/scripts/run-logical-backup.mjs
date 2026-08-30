/**
 * Logical PostgreSQL backup via Prisma (works when pg_dump version mismatches Neon).
 * Usage: node scripts/run-logical-backup.mjs --env-file=../.env
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./load-env-file.mjs";
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envArg = process.argv.find((a) => a.startsWith("--env-file="));
const envFile = envArg ? envArg.split("=")[1] : "../.env";
loadEnvFile(path.resolve(root, envFile));
if (!process.env.DATABASE_URL) {
  loadMigrateEnv();
}
if (!process.env.DATABASE_URL) {
  console.error(JSON.stringify({ ok: false, error: "DATABASE_URL missing" }));
  process.exit(1);
}

const prisma = new PrismaClient();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(root, "backups", `logical-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

function serializeRow(row) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) o[k] = v.toISOString();
    else if (typeof v === "bigint") o[k] = v.toString();
    else if (v !== null && typeof v === "object" && !Array.isArray(v)) o[k] = JSON.stringify(v);
    else o[k] = v;
  }
  return o;
}

async function main() {
  const meta = {
    createdAt: new Date().toISOString(),
    type: "logical-jsonl",
    productionAppUrl: "https://restaurant-os-nine.vercel.app",
  };
  fs.writeFileSync(path.join(outDir, "_meta.json"), JSON.stringify(meta, null, 2));

  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const summary = [];
  for (const { tablename } of tables) {
    const safe = String(tablename).replace(/"/g, "");
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${safe}"`);
    const file = path.join(outDir, `${safe}.jsonl`);
    const lines = rows.map((r) => JSON.stringify(serializeRow(r)));
    fs.writeFileSync(file, lines.join("\n") + (lines.length ? "\n" : ""));
    summary.push({ table: safe, rows: rows.length, file: path.basename(file) });
  }

  const manifest = { ok: true, outDir, tableCount: summary.length, tables: summary };
  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2));

  const totalRows = summary.reduce((a, t) => a + t.rows, 0);
  const restorable = summary.length > 0 && summary.some((t) => t.table === "reservations");

  console.log(
    JSON.stringify(
      {
        ok: restorable && totalRows > 0,
        outDir,
        tableCount: summary.length,
        totalRows,
        hasReservationTable: summary.some((t) => t.table === "reservations"),
        note: "Logical backup — each table stored as JSONL for restore validation",
      },
      null,
      2
    )
  );

  if (!restorable) process.exit(1);
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ ok: false, error: e.message }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
