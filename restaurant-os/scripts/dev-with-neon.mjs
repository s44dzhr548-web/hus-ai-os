#!/usr/bin/env node
/** Start dev server with DB credentials from migrate env loader (no shell echo). */
import { spawn } from "child_process";
import { loadMigrateEnv, isValidDbUrl } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();
const url = process.env.DATABASE_URL;
if (!isValidDbUrl(url)) {
  console.error("[dev-with-neon] invalid DATABASE_URL — set .env.neon or .env.local");
  process.exit(1);
}

console.log("[dev-with-neon] starting next dev on :3005 with loaded DB env");
const child = spawn("npx", ["next", "dev", "-p", "3005"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
