import { describe, expect, it } from "vitest";
import { getPortfolioManagerState } from "@/lib/portfolio/manager";
import { getGlobalMarketBrain } from "@/lib/intelligence/market-brain";
import { getResearchNews } from "@/lib/intelligence/research-agent";
import { getStrategyMarketplace } from "@/lib/strategies/marketplace";
import { runMultiAgentConsensus } from "@/lib/intelligence/multi-agent-consensus";
import { getImprovementEngineState } from "@/lib/learning/improvement-engine";
import { runGuardianProAssessment } from "@/lib/risk/guardian-pro";
import { buildCEODashboard } from "@/lib/intelligence/ceo-dashboard";
import { buildContributions } from "@/lib/intelligence/contributions";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { computeTechnical } from "@/lib/market/indicators";
import { generateMockBars } from "@/lib/data/mock-market";

describe("world-class trading AI modules", () => {
  it("portfolio manager returns allocations", async () => {
    const state = await getPortfolioManagerState();
    expect(state.allocations.length).toBeGreaterThan(0);
    expect(state.totalEquity).toBeGreaterThan(0);
  });

  it("global market brain returns regions and macro", async () => {
    const brain = await getGlobalMarketBrain();
    expect(brain.regions.length).toBeGreaterThanOrEqual(6);
    expect(brain.crossMarketInsights.length).toBeGreaterThan(0);
  });

  it("research agent returns bilingual news", async () => {
    const news = await getResearchNews();
    expect(news.items.length).toBeGreaterThan(0);
    expect(news.items[0].headlineAr.length).toBeGreaterThan(5);
  });

  it("strategy marketplace has 8 strategies", () => {
    expect(getStrategyMarketplace().length).toBe(8);
  });

  it("multi-agent consensus returns 7 agents", async () => {
    const consensus = await runMultiAgentConsensus("AAPL", "en");
    expect(consensus.agents.length).toBe(7);
    expect(consensus.consensusScore).toBeGreaterThan(0);
  });

  it("improvement engine tracks history", () => {
    const state = getImprovementEngineState();
    expect(state.history.length).toBeGreaterThan(0);
  });

  it("guardian pro runs checks", async () => {
    const portfolio = await getPaperPortfolio();
    const result = runGuardianProAssessment("AAPL", "buy", 1, portfolio, 100);
    expect(result.checks.length).toBeGreaterThanOrEqual(6);
  });

  it("CEO dashboard aggregates modules", async () => {
    const ceo = await buildCEODashboard();
    expect(ceo.topOpportunities.length).toBeGreaterThan(0);
    expect(ceo.compliance.paperTradingOnly).toBe(true);
    expect(ceo.compliance.realBrokerExecution).toBe(false);
  });

  it("explainability contributions sum near 100%", () => {
    const bars = generateMockBars("AAPL", 60);
    const technical = computeTechnical(bars);
    const c = buildContributions({
      recommendation: "buy",
      confidence: 0.7,
      riskLevel: "medium",
      signalScore: 72,
      technical,
      newsCount: 3,
      oilImpact: 0.2,
      ratesImpact: -0.1,
      sectorImpact: 0.3,
    });
    const sum = c.technicalPct + c.newsPct + c.macroPct + c.sectorPct + c.riskPct;
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });
});
