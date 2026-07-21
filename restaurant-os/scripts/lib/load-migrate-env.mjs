import { readFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { resolve, join } from "path";

export function normalizeDbUrl(value) {
  if (!value) return value;
  let val = value.trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1).trim();
  }
  if (val.startsWith("postgres://")) {
    val = `postgresql://${val.slice("postgres://".length)}`;
  }
  return val;
}

export function loadMigrateEnv(envFileName = ".env.migrate.tmp") {
  const envFile = resolve(process.cwd(), process.env.MIGRATE_ENV_FILE || envFileName);
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      process.env[m[1]] = normalizeDbUrl(m[2]);
    }
    if (process.env.KEEP_MIGRATE_ENV !== "1") {
      try {
        unlinkSync(envFile);
      } catch {
        /* ignore */
      }
    }
  }

  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = normalizeDbUrl(process.env.DATABASE_URL);
  }
  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = normalizeDbUrl(process.env.DIRECT_URL);
  }
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

export function isValidDbUrl(url) {
  if (!url || url.length < 20) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "postgresql:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function assertDbEnv() {
  loadMigrateEnv();
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!isValidDbUrl(url)) {
    console.error(
      "Invalid DATABASE_URL/DIRECT_URL. Set a full Supabase URI, e.g. postgresql://postgres:***@db.<ref>.supabase.co:5432/postgres"
    );
    process.exit(1);
  }
}

export function listMigrationNames() {
  return readdirSync(join(process.cwd(), "prisma/migrations"))
    .filter((name) => /^\d{14}_/.test(name))
    .sort();
}

export const BASELINE_LAST_APPLIED = "20250719050000_restaurant_ai_access";
export const BASELINE_PENDING = "20250721070000_platform_whatsapp_access_token";
