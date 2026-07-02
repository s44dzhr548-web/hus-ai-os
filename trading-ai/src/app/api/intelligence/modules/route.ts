import { NextResponse } from "next/server";
import { getBotStatus } from "@/lib/bot/auto-paper-bot";
import { getArabicMarketBrief } from "@/lib/intelligence/arabic-market";
import { getEventImpactMap } from "@/lib/intelligence/event-impact";
import { getFeatureGapAnalysis, getCompetitiveAdvantages, COMPETITORS } from "@/lib/competitors/data";
import { getConfidenceAnalytics, getAllRecords, getLearningStats } from "@/lib/learning/tracker";
import {
  buildMarketHealthDashboard,
  buildSmartMoneyFlowMap,
  computeDataQualityScore,
  SCENARIO_TEMPLATES,
} from "@/lib/intelligence/market-intelligence";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getGuardianState } from "@/lib/risk/guardian";
import { runAIAnalysis } from "@/lib/ai/analysis-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const module = searchParams.get("module");
  const symbol = searchParams.get("symbol")?.toUpperCase() ?? "AAPL";
  const lang = searchParams.get("lang") === "en" ? "en" : "ar";

  if (module === "why-now" || module === "what-must-change") {
    const analysis = await runAIAnalysis(symbol, lang);
    return NextResponse.json({
      symbol,
      recommendation: analysis.recommendation,
      whyNow: analysis.whyNow,
      whatMustChange: analysis.whatMustChange,
      transitions: analysis.recommendationTransitions,
    });
  }

  const portfolio = await getPaperPortfolio();
  const [marketHealth, dataQuality, bot] = await Promise.all([
    buildMarketHealthDashboard(),
    computeDataQualityScore(),
    getBotStatus(),
  ]);

  return NextResponse.json({
    bot,
    guardian: getGuardianState(portfolio, DEFAULT_RISK_SETTINGS),
    eventImpact: getEventImpactMap(),
    marketHealth,
    smartMoney: buildSmartMoneyFlowMap(),
    scenarios: SCENARIO_TEMPLATES,
    arabicBrief: getArabicMarketBrief(),
    aiMemory: { stats: getLearningStats(), records: getAllRecords(), confidence: getConfidenceAnalytics() },
    competitors: { count: COMPETITORS.length, gaps: getFeatureGapAnalysis(), advantages: getCompetitiveAdvantages() },
    dataQuality,
  });
}
