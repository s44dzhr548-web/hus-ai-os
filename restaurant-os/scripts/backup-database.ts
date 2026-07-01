/**
 * Daily PostgreSQL backup (Neon / any DATABASE_URL).
 * Usage: npx tsx scripts/backup-database.ts [outputDir]
 *
 * Requires pg_dump on PATH, or set PG_DUMP_PATH.
 * Writes: backups/menuos-YYYY-MM-DD.sql.gz (or .sql if gzip unavailable)
 */
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const outputDir = process.argv[2] || path.join(process.cwd(), "backups");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const date = new Date().toISOString().slice(0, 10);
const baseName = `menuos-${date}`;
const sqlPath = path.join(outputDir, `${baseName}.sql`);
const gzPath = `${sqlPath}.gz`;

const pgDump = process.env.PG_DUMP_PATH || "pg_dump";

console.log(`Backing up to ${sqlPath} ...`);

const dump = spawnSync(pgDump, ["--no-owner", "--no-acl", databaseUrl], {
  encoding: "buffer",
  maxBuffer: 512 * 1024 * 1024,
});

if (dump.status !== 0) {
  console.error(dump.stderr?.toString() || "pg_dump failed");
  process.exit(1);
}

fs.writeFileSync(sqlPath, dump.stdout);

try {
  execSync(`gzip -f "${sqlPath}"`, { stdio: "inherit" });
  console.log(`Backup complete: ${gzPath}`);
} catch {
  console.log(`Backup complete (uncompressed): ${sqlPath}`);
}

const files = fs
  .readdirSync(outputDir)
  .filter((f) => f.startsWith("menuos-") && (f.endsWith(".sql") || f.endsWith(".sql.gz")))
  .sort()
  .reverse();

const keep = Number(process.env.BACKUP_RETENTION_DAYS || 14);
for (const file of files.slice(keep)) {
  fs.unlinkSync(path.join(outputDir, file));
  console.log(`Removed old backup: ${file}`);
}
