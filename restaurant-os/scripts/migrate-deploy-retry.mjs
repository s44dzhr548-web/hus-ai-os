#!/usr/bin/env node
import { spawnSync } from "child_process";
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";

const maxAttempts = 8;
const delayMs = 20000;

loadMigrateEnv();

function isAdvisoryLockError(output) {
  const text = String(output || "");
  return (
    text.includes("P1002") ||
    text.includes("advisory lock") ||
    text.includes("pg_advisory_lock")
  );
}

function isBaselineError(output) {
  const text = String(output || "");
  return text.includes("P3005") || text.includes("database schema is not empty");
}

function isInvalidDbUrlError(output) {
  const text = String(output || "");
  return (
    text.includes("P1013") ||
    text.includes("database string is invalid") ||
    text.includes("missing or invalid DATABASE_URL")
  );
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return { ok: result.status === 0, output };
}

function isDatabaseUpToDate(output) {
  const text = String(output || "");
  return (
    text.includes("Database schema is up to date") ||
    text.includes("No pending migrations") ||
    (text.includes("Following migrations have not yet been applied") === false &&
      text.includes("migrations found") &&
      !text.includes("have not yet been applied"))
  );
}

let baselineAttempted = false;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`[migrate-deploy-retry] attempt ${attempt}/${maxAttempts}`);
  const { ok, output } = run("npx", ["prisma", "migrate", "deploy"]);
  if (ok) {
    console.log("[migrate-deploy-retry] success");
    process.exit(0);
  }

  if (isBaselineError(output) && !baselineAttempted) {
    baselineAttempted = true;
    console.warn("[migrate-deploy-retry] P3005 — baselining existing schema (no reset/push)...");
    const baseline = run("node", ["scripts/baseline-migrations.mjs"]);
    if (baseline.ok) {
      continue;
    }
    console.error("[migrate-deploy-retry] baseline failed");
    process.exit(1);
  }

  if (isInvalidDbUrlError(output)) {
    console.error("[migrate-deploy-retry] invalid DATABASE_URL/DIRECT_URL on build environment");
    process.exit(1);
  }

  if (isAdvisoryLockError(output)) {
    const status = run("npx", ["prisma", "migrate", "status"]);
    if (isDatabaseUpToDate(status.output)) {
      console.warn("[migrate-deploy-retry] advisory lock but schema up to date — continuing build");
      process.exit(0);
    }
    if (attempt < maxAttempts) {
      console.warn(`[migrate-deploy-retry] advisory lock timeout, waiting ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
  }

  console.error("[migrate-deploy-retry] failed");
  process.exit(1);
}
