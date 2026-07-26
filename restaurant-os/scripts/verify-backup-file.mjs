/**
 * Verify a pg_dump SQL file is readable (restore-ready header + tables).
 * Usage: node scripts/verify-backup-file.mjs path/to/menuos-YYYY-MM-DD.sql[.gz]
 */
import fs from "fs";
import zlib from "zlib";
import path from "path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/verify-backup-file.mjs <backup-file>");
  process.exit(1);
}

const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error(JSON.stringify({ ok: false, error: "file not found", path: abs }));
  process.exit(1);
}

let buf = fs.readFileSync(abs);
if (abs.endsWith(".gz")) {
  buf = zlib.gunzipSync(buf);
}

const head = buf.subarray(0, 4096).toString("utf8");
const okHeader =
  head.includes("PostgreSQL database dump") || head.includes("CREATE TABLE") || head.includes("CREATE TYPE");
const sizeBytes = buf.length;

console.log(
  JSON.stringify(
    {
      ok: okHeader && sizeBytes > 1024,
      path: abs,
      sizeBytes,
      hasPgDumpHeader: head.includes("PostgreSQL database dump"),
      hasCreateTable: head.includes("CREATE TABLE"),
    },
    null,
    2
  )
);

process.exit(okHeader && sizeBytes > 1024 ? 0 : 1);
