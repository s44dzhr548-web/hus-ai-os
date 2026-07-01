/**
 * Generate and set MOYASAR_WEBHOOK_SECRET / CRON_SECRET on Vercel (production).
 * Usage: npx tsx scripts/configure-billing-secrets.ts [--dry-run]
 */
import crypto from "crypto";
import { execSync } from "child_process";

const DRY_RUN = process.argv.includes("--dry-run");
const ENV = "production";

const KEYS = ["MOYASAR_WEBHOOK_SECRET", "CRON_SECRET"] as const;

function generateSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function vercelEnvNames(): Set<string> {
  try {
    const out = execSync("npx vercel env ls production", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const names = new Set<string>();
    for (const line of out.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s/);
      if (match) names.add(match[1]);
    }
    return names;
  } catch {
    return new Set();
  }
}

function setVercelEnv(key: string, value: string) {
  if (DRY_RUN) {
    console.log(`[dry-run] Would set ${key}=${value.slice(0, 8)}...`);
    return;
  }
  try {
    execSync(`npx vercel env rm ${key} ${ENV} --yes`, { stdio: "ignore" });
  } catch {
    /* not set yet */
  }
  execSync(`npx vercel env add ${key} ${ENV}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

async function main() {
  console.log("=== Configure Billing Secrets (Vercel Production) ===\n");

  const existing = vercelEnvNames();
  const generated: Record<string, string> = {};

  for (const key of KEYS) {
    if (existing.has(key)) {
      console.log(`✓ ${key} already configured on Vercel`);
      continue;
    }
    const value = generateSecret();
    generated[key] = value;
    console.log(`+ Setting ${key}...`);
    setVercelEnv(key, value);
    console.log(`  ${key}=${value.slice(0, 12)}...`);
  }

  if (Object.keys(generated).length === 0) {
    console.log("\nAll billing secrets already present.");
    return;
  }

  console.log("\n--- Action required in Moyasar Dashboard ---");
  console.log("Webhook URL: https://restaurant-os-nine.vercel.app/api/billing/webhook");
  console.log("Events: payment_paid, payment_faild");
  if (generated.MOYASAR_WEBHOOK_SECRET) {
    console.log(`Secret Token: ${generated.MOYASAR_WEBHOOK_SECRET}`);
  }
  console.log("\nRedeploy required for new env vars to take effect.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
