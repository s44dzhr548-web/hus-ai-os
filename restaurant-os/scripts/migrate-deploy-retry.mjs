#!/usr/bin/env node
import { execSync } from "child_process";

const maxAttempts = 6;
const delayMs = 15000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    console.log(`[migrate-deploy-retry] attempt ${attempt}/${maxAttempts}`);
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[migrate-deploy-retry] success");
    process.exit(0);
  } catch (e) {
    const msg = String(e.message || e);
    if (attempt >= maxAttempts || !msg.includes("P1002")) {
      console.error("[migrate-deploy-retry] failed");
      process.exit(1);
    }
    console.warn(`[migrate-deploy-retry] advisory lock timeout, waiting ${delayMs}ms...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
