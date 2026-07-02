#!/usr/bin/env node
/**
 * Generate CRON_SECRET and sync to .env.local + Vercel.
 * Usage: node scripts/setup-cron-secret.mjs
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function upsertEnvLines(filePath, updates) {
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (keys.has(key)) {
      out.push(`${key}=${updates[key]}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) out.push(`${key}=${value}`);
  }
  fs.writeFileSync(filePath, out.join("\n") + "\n");
}

async function main() {
  const existing = loadEnvFile(ENV_FILE);
  const secret = existing.CRON_SECRET || crypto.randomBytes(32).toString("hex");
  upsertEnvLines(ENV_FILE, { CRON_SECRET: secret });
  console.log("CRON_SECRET written to .env.local");

  const { spawnSync } = await import("child_process");
  const sync = spawnSync(process.execPath, [path.join(__dirname, "provider-env.mjs"), "sync-vercel", "CRON_SECRET"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (sync.status !== 0) {
    console.warn("Vercel sync skipped — run: node scripts/provider-env.mjs sync-env CRON_SECRET");
  } else {
    console.log("CRON_SECRET synced to Vercel");
  }
}

main().catch(console.error);
