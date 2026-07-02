#!/usr/bin/env node
/**
 * Verify Market Intelligence on production.
 * Usage: node scripts/market-intelligence-verify.mjs [baseUrl] [--write-reports]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.argv.find((a) => !a.startsWith("--") && a.endsWith(".app")) ?? "https://trading-ai-beta.vercel.app";
const writeReports = process.argv.includes("--write-reports");

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function step(name, ok, detail) {
  return { name, ok, detail };
}

async function run() {
  const steps = [];
  const startedAt = new Date().toISOString();

  const markets = await fetchJson("/api/markets/assets?ranked=0");
  steps.push(step("Markets assets load", markets.ok && markets.data.total >= 95, `${markets.data?.total ?? 0} assets`));

  for (const [label, path, min] of [
    ["Saudi tab", "/api/markets/assets?market=saudi&ranked=0", 20],
    ["USA tab", "/api/markets/assets?market=usa&ranked=0", 15],
    ["Crypto tab", "/api/markets/assets?category=crypto&ranked=0", 10],
    ["Gold tab", "/api/markets/assets?category=gold&ranked=0", 2],
    ["Oil tab", "/api/markets/assets?category=oil&ranked=0", 3],
  ]) {
    const r = await fetchJson(path);
    steps.push(step(label, r.ok && r.data.total >= min, `${r.data?.total ?? 0} assets`));
  }

  const aramco = await fetchJson("/api/company/2222.SR/profile");
  steps.push(step("Aramco profile API", aramco.ok && aramco.data.profile?.overview?.symbol === "2222", aramco.ok ? "2222 OK" : `HTTP ${aramco.status}`));

  const apple = await fetchJson("/api/company/AAPL/profile");
  steps.push(step("Apple profile API", apple.ok && apple.data.profile?.ai?.recommendation, apple.ok ? apple.data.profile.ai.recommendation : `HTTP ${apple.status}`));

  const btc = await fetchJson("/api/company/BTC-USD/profile");
  steps.push(step("BTC profile API", btc.ok && btc.data.profile?.overview?.symbol === "BTCUSD", btc.ok ? "BTCUSD OK" : `HTTP ${btc.status}`));

  const profilePage = await fetch(`${BASE}/dashboard/markets/AAPL`);
  steps.push(step("Profile page route", profilePage.ok, `HTTP ${profilePage.status}`));

  const marketsPage = await fetch(`${BASE}/dashboard/markets`);
  steps.push(step("Markets page", marketsPage.ok, `HTTP ${marketsPage.status}`));

  const paper = await fetch(`${BASE}/api/paper/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 1 }),
  });
  const paperData = await paper.json().catch(() => ({}));
  steps.push(step("Paper order only", paperData.brokerEnabled === false && paperData.executionMode === "paper_only", paperData.ok ? "paper buy ok" : paperData.error ?? "blocked"));

  const finishedAt = new Date().toISOString();
  const allPassed = steps.every((s) => s.ok);
  const stats = markets.data?.stats ?? {};

  const universeReport = [
    "# MARKET_UNIVERSE_COMPLETE_REPORT",
    "",
    `**Production URL:** ${BASE}/dashboard/markets`,
    `**Verified:** ${finishedAt}`,
    `**Result:** ${allPassed ? "✅ PASS" : "❌ FAIL"}`,
    "",
    "## Assets per market",
    "",
    `- Total: ${stats.total ?? markets.data?.total ?? "—"}`,
    `- Saudi: ${stats.saudi ?? "—"}`,
    `- US: ${stats.us ?? "—"}`,
    `- Crypto: ${stats.crypto ?? "—"}`,
    `- Forex: ${stats.forex ?? "—"}`,
    `- ETF: ${stats.etf ?? "—"}`,
    `- Index: ${stats.index ?? "—"}`,
    "",
    "## Behavior",
    "",
    "- All assets load without search",
    "- Category filters + 16 sort options",
    "- Cards show logo, weekly/monthly change, AI scores",
    "- View Intelligence Profile links to `/dashboard/markets/[symbol]`",
    "",
  ].join("\n");

  const profileReport = [
    "# COMPANY_INTELLIGENCE_PROFILE_REPORT",
    "",
    `**Profile route:** ${BASE}/dashboard/markets/[symbol]`,
    `**Verified:** ${finishedAt}`,
    "",
    "## Sections",
    "",
    "- Overview, Live Market Data, AI Recommendation",
    "- Why AI Selected It, Financials, Announcements, News",
    "- Technical Analysis, Risk Guardian, Related Assets",
    "- Linked Data Providers status panel",
    "- Paper Buy/Sell, Watchlist, Alert, Journal actions",
    "",
    "## API routes",
    "",
    "- GET /api/company/[symbol]/profile",
    "- GET /api/company/[symbol]/quote|financials|news|announcements|technical|risk|ai",
    "- POST /api/paper/order, /api/watchlist/add, /api/alerts/create, /api/journal/add",
    "",
    "## Verification",
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...steps.map((s) => `| ${s.name} | ${s.ok ? "✅" : "❌"} | ${s.detail} |`),
    "",
  ].join("\n");

  const finalReport = [
    "# FINAL_MARKET_INTELLIGENCE_REPORT",
    "",
    `**Production URL:** ${BASE}`,
    `**Markets:** ${BASE}/dashboard/markets`,
    `**Example profiles:**`,
    `- [Aramco](${BASE}/dashboard/markets/2222.SR)`,
    `- [Apple](${BASE}/dashboard/markets/AAPL)`,
    `- [Bitcoin](${BASE}/dashboard/markets/BTC-USD)`,
    "",
    "## Status",
    "",
    `- Markets completed: ${allPassed ? "Yes" : "Partial"}`,
    `- Assets loaded: ${markets.data?.total ?? "—"} total`,
    `- Company profile routes: /dashboard/markets/[symbol]`,
    `- Connected providers: Yahoo, CoinGecko, Binance, Frankfurter, Finnhub (when keyed), Polygon (when keyed)`,
    `- Missing provider keys: FINNHUB_API_KEY, POLYGON_API_KEY, NEWS_API_KEY (optional — demo fallback active)`,
    `- Fallback data: Seeded universe + demo quotes/news/financials when live unavailable`,
    `- Paper trading: Enabled (paper only)`,
    `- Broker: **DISABLED** (realBrokerExecution: false)`,
    `- Supabase persistence: Optional — schema added; runtime uses memory fallback when not configured`,
    "",
    "## Verification steps",
    "",
    ...steps.map((s) => `- ${s.ok ? "✅" : "❌"} ${s.name}: ${s.detail}`),
    "",
  ].join("\n");

  if (writeReports) {
    fs.writeFileSync(path.join(ROOT, "MARKET_UNIVERSE_COMPLETE_REPORT.md"), universeReport);
    fs.writeFileSync(path.join(ROOT, "COMPANY_INTELLIGENCE_PROFILE_REPORT.md"), profileReport);
    fs.writeFileSync(path.join(ROOT, "FINAL_MARKET_INTELLIGENCE_REPORT.md"), finalReport);
  }

  console.log(allPassed ? "✅ ALL PASSED" : "❌ FAILED");
  steps.filter((s) => !s.ok).forEach((s) => console.log(`  ❌ ${s.name}: ${s.detail}`));
  if (writeReports) console.log("Reports written.");
  if (!allPassed) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
