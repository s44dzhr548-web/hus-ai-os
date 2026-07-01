import { describe, expect, it } from "vitest";
import { runAIAnalysis, computeSignalScore } from "@/lib/ai/analysis-engine";
import { generateMockBars } from "@/lib/data/mock-market";

describe("AI analysis engine", () => {
  it("produces full analysis with recommendation", () => {
    const analysis = runAIAnalysis("AAPL");
    expect(analysis.symbol).toBe("AAPL");
    expect(["buy", "hold", "sell"]).toContain(analysis.recommendation);
    expect(analysis.explanation.length).toBeGreaterThan(3);
    expect(analysis.complianceNote).toContain("financial advice");
  });

  it("computes signal score with confidence", () => {
    const bars = generateMockBars("MSFT", 60);
    const score = computeSignalScore("MSFT", bars);
    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.confidence).toBeGreaterThan(0);
  });
});
