#!/usr/bin/env node
/** Sync DATABASE_URL/DIRECT_URL to Vercel production from ../.env.neon (no output of secrets). */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";

const neonFile = resolve(process.cwd(), "../.env.neon");
if (!existsSync(neonFile)) {
  console.error("Missing ../.env.neon");
  process.exit(1);
}

const pooled = readFileSync(neonFile, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .find((l) => l.startsWith("postgresql://") || l.startsWith("postgres://"));

if (!pooled) {
  console.error("No postgresql:// line in .env.neon");
  process.exit(1);
}

const direct = pooled.replace("-pooler", "");

for (const [key, value] of [
  ["DATABASE_URL", pooled],
  ["DIRECT_URL", direct],
]) {
  console.log(`Setting Vercel production ${key}...`);
  spawnSync("npx", ["vercel", "env", "rm", key, "production", "--yes"], {
    stdio: "inherit",
    shell: true,
  });
  const add = spawnSync("npx", ["vercel", "env", "add", key, "production"], {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  });
  if (add.status !== 0) process.exit(add.status ?? 1);
}

console.log("Vercel DATABASE_URL and DIRECT_URL updated.");
