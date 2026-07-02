#!/usr/bin/env node
/**
 * Verify Markets asset universe on production.
 * Usage: node scripts/market-universe-fix-verify.mjs [baseUrl] [--write-report]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_BASE = "https://trading-ai-beta.vercel.app";

const ASSET_ENDPOINTS = [
  { label: "All assets", path: "/api/markets/assets?ranked=0", min: 95 },
  { label: "Saudi market", path: "/api/markets/assets?market=saudi&ranked=0", min: 20 },
  { label: "USA market", path: "/api/markets/assets?market=usa&ranked=0", min: 20 },
  { label: "Crypto category", path: "/api/markets/assets?category=crypto&ranked=0", min: 10 },
  { label: "Forex category", path: "/api/markets/assets?category=forex&ranked=0", min: 10 },
  { label: "Commodities category", path: "/api/markets/assets?category=commodities&ranked=0", min: 10 },
  { label: "Gold category", path: "/api/markets/assets?category=gold&ranked=0", min: 2 },
  { label: "Oil category", path: "/api/markets/assets?category=oil&ranked=0", min: 3 },
  { label: "ETFs category", path: "/api/markets/assets?category=etfs&ranked=0", min: 10 },
  { label: "Indices category", path: "/api/markets/assets?category=indices&ranked=0", min: 10 },
];

const BROWSE_CATEGORIES = ["all", "saudi", "us", "crypto", "forex", "commodity", "gold", "oil", "etf", "index"];

async function fetchJson(base, apiPath) {
  const url = `${base.replace(/\/$/, "")}${apiPath}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function step(name, ok, detail) {
  return { step: name, ok, detail };
}

async function run(baseUrl) {
  const startedAt = new Date().toISOString();
  const steps = [];

  for (const ep of ASSET_ENDPOINTS) {
    const r = await fetchJson(baseUrl, ep.path);
    const total = r.data?.total ?? 0;
    steps.push(
      step(
        ep.label,
        r.ok && total >= ep.min,
        r.ok ? `${total} assets (min ${ep.min})` : `HTTP ${r.status}`
      )
    );
  }

  const ranked = await fetchJson(baseUrl, "/api/markets/assets?category=crypto&pageSize=3");
  const item = ranked.data?.assets?.[0];
  const hasAi =
    item &&
    item.aiOpportunityScore != null &&
    item.expectedReturn != null &&
    item.riskScore != null &&
    item.confidence != null &&
    item.recommendation &&
    item.reason &&
    item.dataSource;
  steps.push(step("AI ranking fields on assets API", Boolean(hasAi), hasAi ? item.symbol : "missing fields"));

  for (const category of BROWSE_CATEGORIES) {
    const r = await fetchJson(baseUrl, `/api/markets/browse?category=${category}&sort=ai_opportunity&page=1&pageSize=6`);
    const min = category === "all" ? 95 : category === "saudi" ? 20 : category === "us" ? 20 : 1;
    steps.push(
      step(
        `Browse ${category}`,
        r.ok && r.data.total >= min && r.data.items?.length > 0,
        r.ok ? `${r.data.total} assets` : `HTTP ${r.status}`
      )
    );
  }

  const search = await fetchJson(baseUrl, "/api/markets/browse?category=saudi&search=Aramco&page=1");
  steps.push(
    step(
      "Search within Saudi category",
      search.ok && search.data.items?.some((i) => i.symbol === "2222"),
      search.ok ? "2222 Aramco found" : `HTTP ${search.status}`
    )
  );

  const page = await fetch(baseUrl + "/dashboard/markets");
  steps.push(step("Markets dashboard page", page.ok, `HTTP ${page.status}`));

  const finishedAt = new Date().toISOString();
  return { startedAt, finishedAt, baseUrl, allPassed: steps.every((s) => s.ok), steps, stats: ranked.data?.stats };
}

function formatReport(r) {
  return [
    "# Trading AI — Market Universe Fix Report",
    "",
    `**URL:** ${r.baseUrl}/dashboard/markets`,
    `**Started:** ${r.startedAt}`,
    `**Finished:** ${r.finishedAt}`,
    `**Result:** ${r.allPassed ? "✅ ALL PASSED" : "❌ FAILURES"}`,
    "",
    "## Asset Universe Layer",
    "",
    "- Single source: `src/lib/markets/asset-universe.ts`",
    "- API: `GET /api/markets/assets` with `market=` and `category=` filters",
    "- Browse: `GET /api/markets/browse` with pagination + AI ranking",
    "- Data badges: Live · Cached · Seeded · Demo",
    "",
    r.stats
      ? `**Universe stats:** total ${r.stats.total} · saudi ${r.stats.saudi} · us ${r.stats.us} · crypto ${r.stats.crypto} · forex ${r.stats.forex} · etf ${r.stats.etf} · index ${r.stats.index}`
      : "",
    "",
    "## Verification Steps",
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...r.steps.map((s) => `| ${s.step} | ${s.ok ? "✅" : "❌"} | ${String(s.detail).replace(/\|/g, "/")} |`),
    "",
    "## Dashboard",
    "",
    `- [Markets](${r.baseUrl}/dashboard/markets)`,
    `- [Assets API](${r.baseUrl}/api/markets/assets?ranked=0)`,
    "",
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes("--write-report");
  const baseUrl = args.find((a) => !a.startsWith("--")) ?? DEFAULT_BASE;

  console.log(`\n🌐 Market universe verification: ${baseUrl}\n`);
  const result = await run(baseUrl);
  if (writeReport) {
    fs.writeFileSync(path.join(ROOT, "MARKET_UNIVERSE_FIX_REPORT.md"), formatReport(result));
    console.log("Report: MARKET_UNIVERSE_FIX_REPORT.md");
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
