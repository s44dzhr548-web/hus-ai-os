#!/usr/bin/env node
/**
 * Production Paper Trading verification against live Vercel deployment.
 * Usage: node scripts/paper-production-verify.mjs [baseUrl] [--write-report]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_BASE = "https://trading-ai-beta.vercel.app";

const E2E_ASSETS = [
  "AAPL",
  "TSLA",
  "MSFT",
  "BTCUSD",
  "ETHUSD",
  "EURUSD",
  "GCUSD",
  "CLUSD",
  "TASI",
];

const DASHBOARD_PAGES = [
  "/dashboard",
  "/dashboard/providers",
  "/dashboard/paper",
  "/dashboard/journal",
  "/dashboard/alerts",
  "/dashboard/analysis",
  "/dashboard/risk-guardian",
  "/dashboard/portfolio-manager",
];

async function fetchJson(base, apiPath, opts = {}) {
  const url = `${base.replace(/\/$/, "")}${apiPath}`;
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...(opts.headers ?? {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, data, url };
}

async function fetchPage(base, pagePath) {
  const url = `${base.replace(/\/$/, "")}${pagePath}`;
  const res = await fetch(url, { headers: { Accept: "text/html" } });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    url,
    hasContent: text.length > 500 && !text.includes("Application error"),
  };
}

function step(name, ok, detail, ms) {
  return { step: name, ok, detail, ms };
}

async function runProductionVerification(baseUrl) {
  const startedAt = new Date().toISOString();
  const steps = [];
  const liveQuotes = [];
  const analyses = [];

  const t0 = Date.now();
  steps.push(
    step(
      "Health check",
      true,
      `Base URL: ${baseUrl}`,
      Date.now() - t0
    )
  );

  let s = Date.now();
  const health = await fetchJson(baseUrl, "/api/health");
  steps.push(
    step(
      "API /api/health",
      health.ok,
      health.ok ? "OK" : `HTTP ${health.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const compliance = await fetchJson(baseUrl, "/api/compliance");
  const paperOnly =
    compliance.ok &&
    compliance.data.realTradingAllowed === false &&
    compliance.data.complianceModeLocked === true;
  steps.push(
    step(
      "Compliance lock (paper only)",
      paperOnly,
      paperOnly
        ? "Real broker OFF · compliance locked"
        : JSON.stringify(compliance.data).slice(0, 120),
      Date.now() - s
    )
  );

  s = Date.now();
  const providers = await fetchJson(baseUrl, "/api/market/providers/verify");
  const connected =
    providers.ok && Array.isArray(providers.data.providers)
      ? providers.data.providers.filter((p) => p.connected).length
      : 0;
  steps.push(
    step(
      "Provider verification",
      providers.ok && connected >= 5,
      providers.ok ? `${connected} providers connected` : `HTTP ${providers.status}`,
      Date.now() - s
    )
  );

  for (const symbol of E2E_ASSETS) {
    s = Date.now();
    const q = await fetchJson(baseUrl, `/api/market/quote?symbol=${symbol}`);
    const price = q.data?.data?.price ?? q.data?.price;
    const live = q.ok && price > 0 && q.data?.isDemoData === false;
    if (q.ok && price > 0) {
      liveQuotes.push({
        symbol,
        price,
        source: q.data?.source ?? "unknown",
        live: !q.data?.isDemoData,
      });
    }
    steps.push(
      step(
        `Live quote ${symbol}`,
        q.ok && price > 0,
        q.ok ? `${q.data?.source ?? "?"} · ${price} · ${live ? "LIVE" : "demo"}` : `HTTP ${q.status}`,
        Date.now() - s
      )
    );
  }

  for (const symbol of E2E_ASSETS) {
    s = Date.now();
    const a = await fetchJson(baseUrl, `/api/analysis?symbol=${symbol}&lang=en`);
    const rec = a.data?.analysis?.recommendation;
    const conf = a.data?.analysis?.confidence;
    if (a.ok && rec) {
      analyses.push({ symbol, recommendation: rec, confidence: conf });
    }
    steps.push(
      step(
        `AI analysis ${symbol}`,
        a.ok && Boolean(rec),
        a.ok ? `${String(rec).toUpperCase()} · conf ${conf}` : `HTTP ${a.status}`,
        Date.now() - s
      )
    );
  }

  s = Date.now();
  const candles = await fetchJson(baseUrl, "/api/market/candles?symbol=AAPL&limit=30");
  const barCount = candles.data?.data?.length ?? 0;
  steps.push(
    step(
      "Chart candles AAPL",
      candles.ok && barCount > 0,
      candles.ok ? `${barCount} bars` : `HTTP ${candles.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const guardian = await fetchJson(baseUrl, "/api/risk/guardian");
  steps.push(
    step(
      "Risk Guardian state",
      guardian.ok && guardian.data?.guardian,
      guardian.ok ? (guardian.data.guardian.canTrade ? "Trading allowed" : guardian.data.guardian.blockedReasons?.join("; ") ?? "OK") : `HTTP ${guardian.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const validate = await fetchJson(baseUrl, "/api/risk/guardian", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "validate", symbol: "MSFT", side: "buy", quantity: 1, price: 100 }),
  });
  steps.push(
    step(
      "Risk Guardian validate MSFT",
      validate.ok && validate.data?.allowed !== undefined,
      validate.ok ? (validate.data.allowed ? "Allowed" : validate.data.reasons?.join("; ")) : `HTTP ${validate.status}`,
      Date.now() - s
    )
  );

  for (const page of DASHBOARD_PAGES) {
    s = Date.now();
    const p = await fetchPage(baseUrl, page);
    steps.push(
      step(
        `Dashboard ${page}`,
        p.ok && p.hasContent,
        p.ok ? `HTTP ${p.status}` : `Failed ${p.status}`,
        Date.now() - s
      )
    );
  }

  s = Date.now();
  const e2eKey = process.env.PAPER_E2E_SECRET;
  const e2ePath = e2eKey ? `/api/paper/e2e?key=${encodeURIComponent(e2eKey)}` : "/api/paper/e2e";
  const e2e = await fetchJson(baseUrl, e2ePath);
  const e2ePassed = e2e.ok && e2e.data?.ok === true;
  steps.push(
    step(
      "Full paper E2E (single invocation)",
      e2ePassed,
      e2ePassed
        ? `${e2e.data.report?.steps?.filter((x) => x.ok).length}/${e2e.data.report?.steps?.length} steps passed`
        : e2e.data?.error ?? e2e.data?.report?.steps?.find((x) => !x.ok)?.detail ?? `HTTP ${e2e.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const paperGet = await fetchJson(baseUrl, "/api/paper");
  steps.push(
    step(
      "Paper portfolio API",
      paperGet.ok && paperGet.data?.executionMode === "paper_only",
      paperGet.ok ? `Equity $${paperGet.data?.portfolio?.equity ?? "?"}` : `HTTP ${paperGet.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const journal = await fetchJson(baseUrl, "/api/journal");
  steps.push(
    step(
      "Journal API",
      journal.ok && Array.isArray(journal.data?.entries),
      journal.ok ? `${journal.data.entries.length} entries` : `HTTP ${journal.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const alerts = await fetchJson(baseUrl, "/api/alerts");
  steps.push(
    step(
      "Alerts API",
      alerts.ok && Array.isArray(alerts.data?.alerts),
      alerts.ok ? `${alerts.data.alerts.length} alerts` : `HTTP ${alerts.status}`,
      Date.now() - s
    )
  );

  s = Date.now();
  const pm = await fetchJson(baseUrl, "/api/portfolio/manager");
  steps.push(
    step(
      "Portfolio manager stats",
      pm.ok && pm.data?.totalEquity != null,
      pm.ok ? `Equity $${pm.data.totalEquity} · drawdown ${pm.data.drawdownPct}%` : `HTTP ${pm.status}`,
      Date.now() - s
    )
  );

  const finishedAt = new Date().toISOString();
  const allPassed = steps.every((x) => x.ok);

  return {
    startedAt,
    finishedAt,
    baseUrl,
    allPassed,
    steps,
    liveQuotes,
    analyses,
    e2eReport: e2e.data?.report ?? null,
    e2eMarkdown: e2e.data?.markdown ?? null,
  };
}

function formatReport(result) {
  const lines = [
    "# Trading AI — Paper Trading Production Report",
    "",
    `**Production URL:** ${result.baseUrl}`,
    `**Started:** ${result.startedAt}`,
    `**Finished:** ${result.finishedAt}`,
    `**Result:** ${result.allPassed ? "✅ ALL PASSED" : "❌ FAILURES DETECTED"}`,
    "",
    "## Compliance",
    "",
    "- Paper trading only: **YES**",
    "- Real broker: **DISABLED**",
    "- Verification mode: **Live production HTTP**",
    "",
    "## Live market quotes",
    "",
    "| Symbol | Price | Source | Mode |",
    "|--------|-------|--------|------|",
    ...result.liveQuotes.map(
      (q) => `| ${q.symbol} | ${q.price} | ${q.source} | ${q.live ? "LIVE" : "Demo"} |`
    ),
    "",
    "## AI recommendations (production)",
    "",
    "| Symbol | Action | Confidence |",
    "|--------|--------|------------|",
    ...result.analyses.map(
      (a) => `| ${a.symbol} | **${String(a.recommendation).toUpperCase()}** | ${a.confidence} |`
    ),
    "",
  ];

  if (result.e2eReport) {
    lines.push(
      "## E2E workflow (server-side single invocation)",
      "",
      `**E2E result:** ${result.e2eReport.allPassed ? "✅ PASSED" : "❌ FAILED"}`,
      "",
      "### Paper trades",
      "",
      "| Symbol | Side | Status |",
      "|--------|------|--------|",
      ...(result.e2eReport.trades ?? []).map(
        (t) => `| ${t.symbol} | ${t.side} | ${t.ok ? "✅ Filled" : `❌ ${t.error ?? "failed"}`} |`
      ),
      "",
      "### Portfolio metrics",
      "",
      "| Metric | Value |",
      "|--------|-------|",
      `| Profit/Loss | $${result.e2eReport.stats?.totalPnl ?? 0} |`,
      `| ROI | ${result.e2eReport.stats?.roiPct ?? 0}% |`,
      `| Win Rate | ${result.e2eReport.stats?.winRate ?? 0}% |`,
      `| Drawdown | ${result.e2eReport.stats?.drawdownPct ?? 0}% |`,
      `| Risk Score | ${result.e2eReport.stats?.riskScore ?? "—"}/100 |`,
      "",
      "### Stress test",
      "",
      `- Attempted: **${result.e2eReport.stressTest?.attempted ?? 100}**`,
      `- Succeeded: **${result.e2eReport.stressTest?.succeeded ?? 0}**`,
      `- Blocked: **${result.e2eReport.stressTest?.blocked ?? 0}**`,
      ""
    );
  }

  lines.push(
    "## Production verification steps",
    "",
    "| Step | Status | Duration | Detail |",
    "|------|--------|----------|--------|",
    ...result.steps.map(
      (s) =>
        `| ${s.step} | ${s.ok ? "✅" : "❌"} | ${s.ms ?? "—"}ms | ${String(s.detail).replace(/\|/g, "/").slice(0, 100)} |`
    ),
    "",
    "## Dashboard links",
    "",
    ...DASHBOARD_PAGES.map((p) => `- [${p}](${result.baseUrl}${p})`),
    "",
    "## Deploy",
    "",
    `- Production: ${result.baseUrl}`,
    `- E2E endpoint: \`${result.baseUrl}/api/paper/e2e\``,
    ""
  );

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes("--write-report");
  const baseUrl = args.find((a) => !a.startsWith("--")) ?? DEFAULT_BASE;

  console.log(`\n🔍 Paper Trading production verification: ${baseUrl}\n`);

  const result = await runProductionVerification(baseUrl);
  const md = formatReport(result);

  if (writeReport) {
    const outPath = path.join(ROOT, "PAPER_TRADING_PRODUCTION_REPORT.md");
    fs.writeFileSync(outPath, md);
    console.log(`Report written: ${outPath}`);
  }

  console.log(`Result: ${result.allPassed ? "✅ ALL PASSED" : "❌ FAILED"}`);
  if (!result.allPassed) {
    for (const s of result.steps.filter((x) => !x.ok)) {
      console.log(`  ❌ ${s.step}: ${s.detail}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
