#!/usr/bin/env node
/**
 * Verify Opportunity Score formula on production.
 * Usage: node scripts/opportunity-score-formula-verify.mjs [baseUrl] [--write-report]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.argv.find((a) => !a.startsWith("--") && a.endsWith(".app")) ?? "https://trading-ai-beta.vercel.app";
const writeReport = process.argv.includes("--write-report");

async function fetchJson(url) {
  const res = await fetch(`${BASE}${url}`, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function step(name, ok, detail) {
  return { name, ok, detail };
}

function gradeFromScore(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "Avoid";
}

function computeExpectedTotal(b, weights) {
  return Number(
    (
      b.moneyFlow * weights.moneyFlow +
      b.technical * weights.technical +
      b.fundamentals * weights.fundamentals +
      b.newsSentiment * weights.newsSentiment +
      b.macro * weights.macro +
      b.riskManagement * weights.riskManagement
    ).toFixed(1)
  );
}

async function run() {
  const steps = [];
  const startedAt = new Date().toISOString();

  const premium = await fetchJson("/api/smart-money/opportunities?category=best_inflow&grades=premium");
  const weights = premium.data.scoreWeights ?? {};
  const top = premium.data.opportunities?.[0];

  const allForTop = await fetchJson("/api/smart-money/opportunities?category=best_inflow&grades=all");
  const sample = top ?? allForTop.data.opportunities?.[0];

  steps.push(
    step(
      "Premium opportunities API",
      premium.ok,
      premium.data.opportunities?.length > 0
        ? `top=${top?.displaySymbol ?? "—"} grade=${top?.grade ?? "—"} score=${top?.score ?? "—"}`
        : `0 premium · fallback sample=${sample?.displaySymbol ?? "—"}`
    )
  );

  const all = await fetchJson("/api/smart-money/opportunities?category=best_inflow&grades=all");
  steps.push(step("All grades API", all.ok && all.data.opportunities?.length >= premium.data.opportunities?.length, `${all.data.opportunities?.length ?? 0} items`));

  const formulaOk = sample?.breakdown && weights.moneyFlow === 0.25
    ? computeExpectedTotal(sample.breakdown, weights) === sample.score
    : false;
  steps.push(step("Weighted formula", formulaOk, formulaOk ? `${sample.score}/100 verified` : "breakdown mismatch"));

  const gradeOk = sample ? sample.grade === gradeFromScore(sample.score) : false;
  steps.push(step("Grade mapping", gradeOk, sample ? `${sample.grade} for ${sample.score}` : "no sample item"));

  const asset = await fetchJson("/api/smart-money/asset/2222.SR");
  steps.push(
    step(
      "Asset profile score",
      asset.ok && asset.data.flow?.breakdown?.riskManagement != null && asset.data.flow?.grade,
      `${asset.data.flow?.opportunityScore ?? "—"}/100 · ${asset.data.flow?.grade ?? "—"}`
    )
  );

  const page = await fetch(`${BASE}/dashboard/smart-money`);
  steps.push(step("Smart money page", page.ok, `HTTP ${page.status}`));

  const finishedAt = new Date().toISOString();
  const allPassed = steps.every((s) => s.ok);

  const report = [
    "# OPPORTUNITY_SCORE_FORMULA_REPORT",
    "",
    `**Production URL:** ${BASE}/dashboard/smart-money`,
    `**Started:** ${startedAt}`,
    `**Finished:** ${finishedAt}`,
    `**Result:** ${allPassed ? "✅ ALL PASSED" : "❌ FAILURES"}`,
    "",
    "## Weighted Opportunity Score",
    "",
    "| Component | Weight |",
    "|-----------|--------|",
    "| Money Flow | 25% |",
    "| Technical Analysis | 20% |",
    "| Fundamental Analysis | 20% |",
    "| News & Sentiment | 15% |",
    "| Macro Economy | 10% |",
    "| Risk Management | 10% |",
    "",
    "## Grade Scale",
    "",
    "| Grade | Range |",
    "|-------|-------|",
    "| A+ | 90–100 |",
    "| A | 80–89 |",
    "| B | 70–79 |",
    "| C | 60–69 |",
    "| Avoid | below 60 |",
    "",
    "## UI",
    "",
    "- Default view: A+ and A opportunities only",
    "- Toggle: show all grades",
    "- Score breakdown on every opportunity card",
    "- Multi-signal explanation (EN + AR)",
    "",
    "## Safety",
    "",
    "- Paper trading only",
    "- Broker: **DISABLED**",
    "- No real money execution",
    "",
    "## Verification",
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...steps.map((s) => `| ${s.name} | ${s.ok ? "✅" : "❌"} | ${s.detail} |`),
    "",
  ].join("\n");

  if (writeReport) {
    fs.writeFileSync(path.join(ROOT, "OPPORTUNITY_SCORE_FORMULA_REPORT.md"), report);
    console.log("Report: OPPORTUNITY_SCORE_FORMULA_REPORT.md");
  }

  console.log(allPassed ? "✅ ALL PASSED" : "❌ FAILURES");
  if (!allPassed) {
    for (const s of steps.filter((x) => !x.ok)) console.error(`- ${s.name}: ${s.detail}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
