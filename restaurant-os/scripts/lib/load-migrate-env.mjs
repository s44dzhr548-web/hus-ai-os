import { readFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { resolve, join } from "path";

const DB_ENV_KEYS = [
  "DIRECT_URL",
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "SUPABASE_DB_URL",
];

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

  loadNeonFallback();

  for (const key of DB_ENV_KEYS) {
    if (process.env[key]) {
      process.env[key] = normalizeDbUrl(process.env[key]);
    }
  }

  resolveDbEnv();
}

function loadNeonFallback() {
  if (isValidDbUrl(process.env.DATABASE_URL) || isValidDbUrl(process.env.DIRECT_URL)) return;

  const candidates = [
    resolve(process.cwd(), "../.env.neon"),
    resolve(process.cwd(), "../../.env.neon"),
    resolve(process.cwd(), ".env.neon"),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("postgresql://") || l.startsWith("postgres://"));
    if (!line) continue;

    const pooled = normalizeDbUrl(line);
    const direct = normalizeDbUrl(line.replace("-pooler", ""));
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = pooled;
    if (!process.env.DIRECT_URL) process.env.DIRECT_URL = direct;
    console.log(`[migrate-env] loaded database URL from ${file}`);
    return;
  }
}

/** Pick pooled + direct URLs from common Vercel/Supabase/Neon env names. */
export function resolveDbEnv() {
  const direct =
    process.env.DIRECT_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DB_URL ||
    null;
  const pooled =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    null;

  if (direct) process.env.DIRECT_URL = normalizeDbUrl(direct);
  if (pooled) process.env.DATABASE_URL = normalizeDbUrl(pooled);
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
  if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }
}

export function isValidDbUrl(url) {
  if (!url || url.length < 20) return false;
  if (url.includes("[YOUR-PASSWORD]") || url === "placeholder") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "postgresql:" && Boolean(parsed.hostname);
  } catch {
    return /^postgresql:\/\/.+@.+:\d+\/\w+/i.test(url);
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
