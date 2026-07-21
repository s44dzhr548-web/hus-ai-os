#!/usr/bin/env node
import { spawnSync } from "child_process";
import { loadMigrateEnv, isValidDbUrl } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!isValidDbUrl(url)) {
  console.error("[migrate-deploy] missing or invalid DATABASE_URL/DIRECT_URL");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
