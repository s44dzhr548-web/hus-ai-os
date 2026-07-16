#!/usr/bin/env node
import { spawnSync } from "child_process";

const maxAttempts = 8;
const delayMs = 20000;

function isAdvisoryLockError(output) {
  const text = String(output || "");
  return (
    text.includes("P1002") ||
    text.includes("advisory lock") ||
    text.includes("pg_advisory_lock")
  );
}

function runMigrate() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return { ok: result.status === 0, output };
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`[migrate-deploy-retry] attempt ${attempt}/${maxAttempts}`);
  const { ok, output } = runMigrate();
  if (ok) {
    console.log("[migrate-deploy-retry] success");
    process.exit(0);
  }
  if (attempt >= maxAttempts || !isAdvisoryLockError(output)) {
    console.error("[migrate-deploy-retry] failed");
    process.exit(1);
  }
  console.warn(`[migrate-deploy-retry] advisory lock timeout, waiting ${delayMs}ms...`);
  await new Promise((r) => setTimeout(r, delayMs));
}
