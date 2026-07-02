import { describe, expect, it } from "vitest";
import { buildMarketConsensus, buildWhatMustChange, buildWhyNow } from "@/lib/intelligence/decision-engines";
import { getCrossMarketIntelligence } from "@/lib/intelligence/cross-market";
import { computeDataQualityScore, SCENARIO_TEMPLATES } from "@/lib/intelligence/market-intelligence";
import { runStrategyLab } from "@/lib/intelligence/strategy-lab";
import { getConfidenceAnalytics, simulatePortfolioFollowingAI } from "@/lib/learning/memory";
import { getJournalEntries, addJournalEntry } from "@/lib/journal/store";
import { ROADMAP } from "@/lib/competitors/data";
import { computeTechnical } from "@/lib/market/indicators";
import { generateMockBars } from "@/lib/data/mock-market";

describe("intelligence platform", () => {
  it("returns cross-market chains", () => {
    const data = getCrossMarketIntelligence();
    expect(data.chains.length).toBeGreaterThanOrEqual(5);
    expect(data.relations.length).toBeGreaterThanOrEqual(6);
  });

  it("builds decision engines", () => {
    const bars = generateMockBars("AAPL", 60);
    const technical = computeTechnical(bars);
    const ctx = {
      symbol: "AAPL",
      recommendation: "buy" as const,
      confidence: 0.7,
      signalScore: 72,
      technical,
      newsSentiment: 0.3,
      sectorStrength: 65,
      oilImpact: 0.12,
      ratesImpact: -0.15,
    };
    expect(buildWhyNow(ctx).whyNow.en.length).toBeGreaterThan(20);
    expect(buildWhatMustChange(ctx).length).toBeGreaterThan(3);
    expect(buildMarketConsensus({ ...ctx, riskLevel: "medium", aiScore: 72 }).sources.length).toBe(8);
  });

  it("computes data quality score", async () => {
    const dq = await computeDataQualityScore();
    expect(dq.score).toBeGreaterThan(0);
    expect(dq.breakdown.length).toBe(4);
  });

  it("has scenario templates", () => {
    expect(SCENARIO_TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it("runs strategy lab", async () => {
    const lab = await runStrategyLab("AAPL");
    expect(lab.strategies.length).toBeGreaterThanOrEqual(7);
  });

  it("computes confidence analytics", () => {
    const analytics = getConfidenceAnalytics();
    expect(analytics.winRateByConfidence.length).toBeGreaterThan(0);
  });

  it("simulates portfolio following AI", async () => {
    const sim = await simulatePortfolioFollowingAI(50_000);
    expect(sim.initialCapital).toBe(50_000);
  });

  it("stores journal entries with emotion", () => {
    const before = getJournalEntries().length;
    addJournalEntry({
      symbol: "MSFT",
      userDecision: "hold",
      aiRecommendation: "buy",
      userReason: "Wait for pullback",
      userNotes: "Patience",
      emotion: "uncertain",
      lessonsLearned: "Don't FOMO",
    });
    expect(getJournalEntries().length).toBe(before + 1);
  });

  it("has 4-phase competitor roadmap", () => {
    expect(ROADMAP.length).toBe(4);
  });
});
