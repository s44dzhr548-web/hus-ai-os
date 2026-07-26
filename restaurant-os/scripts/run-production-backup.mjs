/**
 * Production-safe backup runner (loads env file without logging secrets).
 * Usage: node scripts/run-production-backup.mjs [--env-file=../.env]
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envArg = process.argv.find((a) => a.startsWith("--env-file="));
const envFile = envArg ? envArg.split("=")[1] : "../.env";
const envPath = path.resolve(root, envFile);

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const pgDump =
  process.env.PG_DUMP_PATH ||
  "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";

if (!process.env.DATABASE_URL) {
  console.error(JSON.stringify({ ok: false, error: "DATABASE_URL missing after env load" }));
  process.exit(1);
}

const outDir = path.join(root, "backups");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const sqlPath = path.join(outDir, `menuos-production-${stamp}.sql`);

console.log(JSON.stringify({ step: "backup-start", target: sqlPath, pgDump: fs.existsSync(pgDump) }));

const dump = spawnSync(pgDump, ["--no-owner", "--no-acl", process.env.DATABASE_URL], {
  encoding: "buffer",
  maxBuffer: 512 * 1024 * 1024,
});

if (dump.status !== 0) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "pg_dump failed",
      detail: dump.stderr?.toString()?.slice(0, 500),
    })
  );
  process.exit(1);
}

fs.writeFileSync(sqlPath, dump.stdout);
const sizeBytes = fs.statSync(sqlPath).size;

const verify = spawnSync(process.execPath, [path.join(__dirname, "verify-backup-file.mjs"), sqlPath], {
  encoding: "utf8",
});

let verifyJson = {};
try {
  verifyJson = JSON.parse(verify.stdout || "{}");
} catch {
  verifyJson = { ok: false };
}

console.log(
  JSON.stringify(
    {
      ok: verifyJson.ok === true,
      backupFile: sqlPath,
      sizeBytes,
      verify: verifyJson,
    },
    null,
    2
  )
);

process.exit(verifyJson.ok ? 0 : 1);
