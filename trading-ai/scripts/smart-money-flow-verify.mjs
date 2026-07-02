#!/usr/bin/env node
/**
 * Verify Smart Money Flow on production.
 * Usage: node scripts/smart-money-flow-verify.mjs [baseUrl] [--write-report]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.argv.find((a) => !a.startsWith("--") && a.endsWith(".app")) ?? "https://trading-ai-beta.vercel.app";
const writeReport = process.argv.includes("--write-report");

async function fetchJson(url, options) {
  const res = await fetch(`${BASE}${url}`, { headers: { Accept: "application/json", ...(options?.headers ?? {}) }, ...options });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function step(name, ok, detail) {
  return { name, ok, detail };
}

async function run() {
  const steps = [];
  const startedAt = new Date().toISOString();

  const flow = await fetchJson("/api/smart-money/flow");
  steps.push(step("Flow API", flow.ok && flow.data.flow?.assetFlows?.length > 0, `${flow.data.flow?.assetFlows?.length ?? 0} asset flows`));

  const sectors = await fetchJson("/api/smart-money/sectors");
  steps.push(step("Sectors API", sectors.ok && sectors.data.inflows?.length > 0, `${sectors.data.inflows?.length ?? 0} inflows`));

  const opps = await fetchJson("/api/smart-money/opportunities?category=best_inflow");
  steps.push(step("Opportunities API", opps.ok && opps.data.opportunities?.length > 0, `top=${opps.data.opportunities?.[0]?.displaySymbol}`));

  const rotation = await fetchJson("/api/smart-money/rotation");
  steps.push(step("Rotation API", rotation.ok && rotation.data.rotations?.length > 0, `${rotation.data.rotations?.length ?? 0} rotations`));

  const asset = await fetchJson("/api/smart-money/asset/2222.SR");
  steps.push(step("Asset flow profile", asset.ok && asset.data.flow?.symbol === "2222", "2222 OK"));

  const page = await fetch(`${BASE}/dashboard/smart-money`);
  steps.push(step("Smart money page", page.ok, `HTTP ${page.status}`));

  const pageAr = await fetch(`${BASE}/dashboard/smart-money`, { headers: { "Accept-Language": "ar" } });
  steps.push(step("Smart money page (AR route)", pageAr.ok, `HTTP ${pageAr.status}`));

  const finishedAt = new Date().toISOString();
  const allPassed = steps.every((s) => s.ok);

  const report = [
    "# SMART_MONEY_FLOW_REPORT",
    "",
    `**Production URL:** ${BASE}/dashboard/smart-money`,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Result:** ${allPassed ? "✅ ALL PASSED" : "❌ FAILURES"}`,
    "",
    "## Engine",
    "",
    "- Smart Money Flow Opportunity Engine",
    "- Tracks: stocks, Saudi, US, crypto, gold, oil, forex, bonds, cash, sectors",
    "- Detects: inflow/outflow, rotation, volume anomaly, accumulation/distribution, risk-on/off",
    "- Opportunity score: 25% flow · 20% technical · 20% fundamentals · 15% news · 10% macro · 10% risk",
    "",
    "## Routes",
    "",
    `- [Flow Map](${BASE}/dashboard/smart-money)`,
    `- [Flow API](${BASE}/api/smart-money/flow)`,
    `- [Opportunities API](${BASE}/api/smart-money/opportunities)`,
    "",
    "## Safety",
    "",
    "- Paper trading only",
    "- Broker: **DISABLED**",
    "- Live providers when available; demo fallback when missing",
    "- Arabic default + English via i18n",
    "",
    "## Verification",
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...steps.map((s) => `| ${s.name} | ${s.ok ? "✅" : "❌"} | ${s.detail} |`),
    "",
  ].join("\n");

  if (writeReport) fs.writeFileSync(path.join(ROOT, "SMART_MONEY_FLOW_REPORT.md"), report);
  console.log(allPassed ? "✅ ALL PASSED" : "❌ FAILED");
  steps.filter((s) => !s.ok).forEach((s) => console.log(`  ❌ ${s.name}: ${s.detail}`));
  if (writeReport) console.log("Report: SMART_MONEY_FLOW_REPORT.md");
  if (!allPassed) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
