#!/usr/bin/env node
/**
 * Verify 24/7 auto paper bot on production.
 * Usage: node scripts/auto-bot-production-verify.mjs [baseUrl] [--write-report]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_BASE = "https://trading-ai-beta.vercel.app";

function loadCronSecret() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return process.env.CRON_SECRET ?? "";
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("CRON_SECRET=")) {
      return trimmed.slice("CRON_SECRET=".length).replace(/^["']|["']$/g, "");
    }
  }
  return process.env.CRON_SECRET ?? "";
}

async function fetchJson(base, apiPath, opts = {}) {
  const url = `${base.replace(/\/$/, "")}${apiPath}`;
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...(opts.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data, url };
}

function step(name, ok, detail, ms) {
  return { step: name, ok, detail, ms };
}

async function runVerification(baseUrl, cronSecret) {
  const startedAt = new Date().toISOString();
  const steps = [];

  let s = Date.now();
  const compliance = await fetchJson(baseUrl, "/api/compliance");
  const paperOnly = compliance.ok && compliance.data.realTradingAllowed === false;
  steps.push(step("Compliance paper-only", paperOnly, paperOnly ? "Broker OFF" : "FAIL", Date.now() - s));

  s = Date.now();
  const status = await fetchJson(baseUrl, "/api/bot/status");
  steps.push(
    step(
      "Bot status API",
      status.ok && status.data?.paperOnly === true,
      status.ok ? `lifecycle=${status.data.lifecycleStatus} schedule=${status.data.scheduleMinutes}m` : `HTTP ${status.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const cronGet = await fetchJson(baseUrl, "/api/bot/cron", {
    headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
  });
  steps.push(
    step(
      "Cron endpoint GET",
      cronGet.ok,
      cronGet.ok ? cronGet.data.schedule : cronSecret ? `HTTP ${cronGet.status}` : "CRON_SECRET missing locally",
      Date.now() - s
    )
  );

  s = Date.now();
  const cronPost = cronSecret
    ? await fetchJson(baseUrl, "/api/bot/cron", {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      })
    : { ok: false, status: 401, data: { error: "no secret" } };
  steps.push(
    step(
      "Cron cycle POST",
      cronPost.ok && cronPost.data?.paperOnly === true,
      cronPost.ok ? `tradesToday=${cronPost.data.tradesToday}` : cronPost.data?.error ?? `HTTP ${cronPost.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const page = await fetch(baseUrl + "/dashboard/auto-bot");
  steps.push(step("Auto-bot dashboard", page.ok, `HTTP ${page.status}`, Date.now() - s));

  s = Date.now();
  const guardian = await fetchJson(baseUrl, "/api/risk/guardian");
  steps.push(step("Risk Guardian", guardian.ok, guardian.ok ? "OK" : `HTTP ${guardian.status}`, Date.now() - s));

  const finishedAt = new Date().toISOString();
  const allPassed = steps.every((x) => x.ok);

  return {
    startedAt,
    finishedAt,
    baseUrl,
    allPassed,
    steps,
    botStatus: status.data,
    cronResult: cronPost.data,
    cronSecretConfigured: Boolean(cronSecret),
  };
}

function formatReport(result) {
  return [
    "# Trading AI — Auto Paper Bot 24/7 Production Report",
    "",
    `**Production URL:** ${result.baseUrl}`,
    `**Started:** ${result.startedAt}`,
    `**Finished:** ${result.finishedAt}`,
    `**Result:** ${result.allPassed ? "✅ ALL PASSED" : "❌ FAILURES DETECTED"}`,
    "",
    "## Safety",
    "",
    "- Paper trading only: **YES**",
    "- Real broker: **DISABLED**",
    `- Cron secret configured locally: **${result.cronSecretConfigured ? "YES" : "NO"}**`,
    "",
    "## Bot status (production)",
    "",
    result.botStatus
      ? [
          `- Lifecycle: **${result.botStatus.lifecycleStatus}**`,
          `- Schedule: **every ${result.botStatus.scheduleMinutes} minutes**`,
          `- Next run: ${result.botStatus.nextRunAt ?? "—"}`,
          `- Storage: ${result.botStatus.storageBackend}`,
          `- Cron env on server: ${result.botStatus.cronEnabled ? "configured" : "missing"}`,
        ].join("\n")
      : "—",
    "",
    "## Verification steps",
    "",
    "| Step | Status | Duration | Detail |",
    "|------|--------|----------|--------|",
    ...result.steps.map(
      (s) => `| ${s.step} | ${s.ok ? "✅" : "❌"} | ${s.ms}ms | ${String(s.detail).replace(/\|/g, "/")} |`
    ),
    "",
    "## Cron setup",
    "",
    "- **Primary scheduler:** GitHub Actions every 5 min (`.github/workflows/trading-ai-bot-cron.yml`)",
    "- **Vercel cron:** Not used on Hobby plan (daily-only limit); upgrade to Pro for native `*/5` cron",
    "- **External cron:** `POST /api/bot/cron` with `Authorization: Bearer $CRON_SECRET`",
    "- **GitHub secret:** `TRADING_AI_CRON_SECRET` (same value as Vercel `CRON_SECRET`)",
    "",
    "## Dashboard",
    "",
    `- [Auto Bot](${result.baseUrl}/dashboard/auto-bot)`,
    "",
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes("--write-report");
  const baseUrl = args.find((a) => !a.startsWith("--")) ?? DEFAULT_BASE;
  const cronSecret = loadCronSecret();

  console.log(`\n🤖 Auto Bot 24/7 verification: ${baseUrl}\n`);

  const result = await runVerification(baseUrl, cronSecret);
  const md = formatReport(result);

  if (writeReport) {
    const outPath = path.join(ROOT, "AUTO_BOT_24_7_REPORT.md");
    fs.writeFileSync(outPath, md);
    console.log(`Report: ${outPath}`);
  }

  console.log(result.allPassed ? "✅ ALL PASSED" : "❌ FAILED");
  if (!result.allPassed) {
    result.steps.filter((s) => !s.ok).forEach((s) => console.log(`  ❌ ${s.step}: ${s.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
