#!/usr/bin/env node
/**
 * Verify Markets page filters on production.
 * Usage: node scripts/markets-filters-verify.mjs [baseUrl] [--write-report]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_BASE = "https://trading-ai-beta.vercel.app";

const CATEGORIES = ["all", "saudi", "us", "global", "etf", "crypto", "forex", "commodity", "gold", "oil", "index"];
const SORTS = ["ai_opportunity", "biggest_gainers", "lowest_risk"];

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

  for (const category of CATEGORIES) {
    const r = await fetchJson(baseUrl, `/api/markets/browse?category=${category}&sort=ai_opportunity&page=1&pageSize=6`);
    steps.push(
      step(
        `Browse category ${category}`,
        r.ok && Array.isArray(r.data.items) && (category === "all" ? r.data.total >= 75 : category === "saudi" ? r.data.total >= 8 : r.data.total >= 1),
        r.ok ? `${r.data.total} assets · first=${r.data.items[0]?.symbol ?? "—"}` : `HTTP ${r.status}`
      )
    );
  }

  for (const sort of SORTS) {
    const r = await fetchJson(baseUrl, `/api/markets/browse?category=all&sort=${sort}&page=1&pageSize=3`);
    steps.push(step(`Sort ${sort}`, r.ok && r.data.items?.length > 0, r.ok ? `top=${r.data.items[0]?.symbol}` : `HTTP ${r.status}`));
  }

  const search = await fetchJson(baseUrl, "/api/markets/browse?category=us&search=AAPL&page=1");
  steps.push(
    step(
      "Search within US category",
      search.ok && search.data.items?.some((i) => i.symbol === "AAPL"),
      search.ok ? "AAPL found" : `HTTP ${search.status}`
    )
  );

  const page = await fetch(baseUrl + "/dashboard/markets");
  steps.push(step("Markets dashboard page", page.ok, `HTTP ${page.status}`));

  const cardFields = await fetchJson(baseUrl, "/api/markets/browse?category=crypto&page=1&pageSize=1");
  const item = cardFields.data?.items?.[0];
  const hasFields =
    item &&
    item.rank &&
    item.name &&
    item.price != null &&
    item.expectedReturnPct != null &&
    item.riskScore != null &&
    item.recommendation &&
    item.whySelected &&
    item.dataSource;
  steps.push(step("Card fields complete", Boolean(hasFields), hasFields ? item.symbol : "missing fields"));

  const finishedAt = new Date().toISOString();
  return { startedAt, finishedAt, baseUrl, allPassed: steps.every((s) => s.ok), steps };
}

function formatReport(r) {
  return [
    "# Trading AI — Market Filters Production Report",
    "",
    `**URL:** ${r.baseUrl}/dashboard/markets`,
    `**Started:** ${r.startedAt}`,
    `**Finished:** ${r.finishedAt}`,
    `**Result:** ${r.allPassed ? "✅ ALL PASSED" : "❌ FAILURES"}`,
    "",
    "## Behavior",
    "",
    "- No search required — all assets load by default",
    "- Category filters: All, Saudi, US, Global, ETF, Crypto, Forex, Commodities, Gold, Oil, Indices",
    "- Default sort: Highest AI Opportunity",
    "- Pagination via page + infinite scroll on dashboard",
    "",
    "## Steps",
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...r.steps.map((s) => `| ${s.step} | ${s.ok ? "✅" : "❌"} | ${String(s.detail).replace(/\|/g, "/")} |`),
    "",
    "## Dashboard",
    "",
    `- [Markets](${r.baseUrl}/dashboard/markets)`,
    "",
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes("--write-report");
  const baseUrl = args.find((a) => !a.startsWith("--")) ?? DEFAULT_BASE;

  console.log(`\n📊 Markets filters verification: ${baseUrl}\n`);
  const result = await run(baseUrl);
  if (writeReport) {
    fs.writeFileSync(path.join(ROOT, "MARKET_FILTERS_REPORT.md"), formatReport(result));
    console.log("Report: MARKET_FILTERS_REPORT.md");
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
