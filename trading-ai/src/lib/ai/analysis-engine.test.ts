import { describe, expect, it } from "vitest";
import { runAIAnalysis, computeSignalScore } from "@/lib/ai/analysis-engine";
import { generateMockBars } from "@/lib/data/mock-market";
import { unifiedQuote, unifiedSearch } from "@/lib/market/unified";
import { computeTechnical } from "@/lib/market/indicators";

describe("AI analysis engine", () => {
  it("produces full analysis with recommendation", async () => {
    const analysis = await runAIAnalysis("AAPL", "en");
    expect(analysis.symbol).toBe("AAPL");
    expect(["buy", "hold", "sell"]).toContain(analysis.recommendation);
    expect(analysis.explanation.length).toBeGreaterThan(3);
    expect(analysis.explainability).toBeDefined();
    expect(analysis.explainability.fundamental.en.length).toBeGreaterThan(10);
    expect(analysis.whyNow).toBeDefined();
    expect(analysis.recommendationTransitions.length).toBeGreaterThan(0);
    expect(analysis.marketConsensus.consensusPct).toBeGreaterThan(0);
    expect(analysis.complianceNote).toContain("financial advice");
    expect(analysis.technical.trendStrength).toBeGreaterThan(0);
  });

  it("returns Arabic compliance by default", async () => {
    const analysis = await runAIAnalysis("AAPL", "ar");
    expect(analysis.complianceNote).toContain("نصيحة مالية");
  });

  it("computes signal score with confidence", () => {
    const bars = generateMockBars("MSFT", 60);
    const score = computeSignalScore("MSFT", bars);
    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.confidence).toBeGreaterThan(0);
  });
});

describe("market data unified provider", () => {
  it("searches symbol catalog", async () => {
    const results = await unifiedSearch("AAPL", 5);
    expect(results.some((r) => r.symbol === "AAPL")).toBe(true);
  });

  it("returns quote with fallback", async () => {
    const quote = await unifiedQuote("AAPL");
    expect(quote.data.price).toBeGreaterThan(0);
    expect(quote.source).toBeDefined();
  });

  it("computes extended technical indicators", () => {
    const bars = generateMockBars("NVDA", 90);
    const tech = computeTechnical(bars);
    expect(tech.macd).toBeDefined();
    expect(tech.volatility).toBeGreaterThanOrEqual(0);
    expect(tech.volumeTrend).toBeDefined();
  });
});
