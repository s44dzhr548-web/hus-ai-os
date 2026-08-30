#!/usr/bin/env node
/**
 * Manual production migration deploy (structural migrations only).
 * Not run during Vercel build — use after deploy or from CI with DB access.
 *
 *   npm run db:migrate:deploy
 */
import { spawnSync } from "child_process";
import { loadMigrateEnv, isValidDbUrl } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!isValidDbUrl(url)) {
  console.error("[db:migrate:deploy] missing or invalid DATABASE_URL/DIRECT_URL");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
