#!/usr/bin/env node
import { spawnSync } from "child_process";
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/migrate-with-env.mjs <prisma-args...>");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
