import { describe, expect, it } from "vitest";
import { getBotStatus, runBotCycle, setBotEnabled } from "@/lib/bot/auto-paper-bot";
import { getGuardianState, setEmergencyStop, validatePaperTrade } from "@/lib/risk/guardian";
import { runAIDebate } from "@/lib/intelligence/ai-debate";
import { getEventImpactMap } from "@/lib/intelligence/event-impact";
import { getArabicMarketBrief } from "@/lib/intelligence/arabic-market";
import { buildRecommendationTransitions } from "@/lib/intelligence/decision-engines";
import { computeTechnical } from "@/lib/market/indicators";
import { generateMockBars } from "@/lib/data/mock-market";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getPaperPortfolio } from "@/lib/paper/portfolio";

describe("advanced differentiation modules", () => {
  it("returns bot status in demo mode", async () => {
    setBotEnabled(true);
    const status = await getBotStatus();
    expect(status.mode).toBe("demo");
    expect(status.enabled).toBe(true);
    expect(status.maxTradesPerDay).toBeGreaterThan(0);
  });

  it("runs bot cycle without real execution", async () => {
    const status = await runBotCycle();
    expect(status.activityLog.length).toBeGreaterThan(0);
  });

  it("guardian blocks emergency stop", async () => {
    setEmergencyStop(true);
    const portfolio = await getPaperPortfolio();
    const g = getGuardianState(portfolio, DEFAULT_RISK_SETTINGS);
    expect(g.canTrade).toBe(false);
    setEmergencyStop(false);
  });

  it("validates paper trades", async () => {
    const portfolio = await getPaperPortfolio();
    const check = validatePaperTrade("AAPL", "buy", 1, portfolio, 100, DEFAULT_RISK_SETTINGS);
    expect(typeof check.allowed).toBe("boolean");
  });

  it("runs AI debate", async () => {
    const debate = await runAIDebate("AAPL", "en");
    expect(debate.agents.length).toBe(3);
    expect(debate.finalVerdictEn.length).toBeGreaterThan(10);
  });

  it("returns event impact map", () => {
    const map = getEventImpactMap();
    expect(map.events.length).toBeGreaterThanOrEqual(6);
  });

  it("returns arabic market brief", () => {
    const brief = getArabicMarketBrief();
    expect(brief.saudiHighlights.length).toBeGreaterThan(0);
  });

  it("builds recommendation transitions", () => {
    const bars = generateMockBars("NVDA", 60);
    const technical = computeTechnical(bars);
    const ctx = {
      symbol: "NVDA",
      recommendation: "buy" as const,
      confidence: 0.7,
      signalScore: 70,
      technical,
      newsSentiment: 0.2,
      sectorStrength: 60,
      oilImpact: 0.1,
      ratesImpact: -0.1,
    };
    const transitions = buildRecommendationTransitions("buy", ctx);
    expect(transitions.some((t) => t.from === "buy" && t.to === "hold")).toBe(true);
  });
});
