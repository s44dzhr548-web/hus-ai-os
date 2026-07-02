import type {
  AIAnalysis,
  AISignalScore,
  MarketBar,
  Recommendation,
  RiskLevel,
} from "@/types/trading";
import { getMockAsset, MOCK_UNIVERSE } from "@/lib/data/mock-market";
import { getSectorImpact } from "@/lib/data/mock-news";
import { hashSymbol } from "@/lib/data/seed";
import { COMPLIANCE_CONFIG } from "@/lib/compliance/config";
import { computeTechnical } from "@/lib/market/indicators";
import { unifiedCandles, unifiedQuote } from "@/lib/market/unified";
import { fetchEconomicCalendar, fetchNews } from "@/lib/market/providers/news";
import { logRecommendation } from "@/lib/audit/log";
import { buildExplainability } from "@/lib/intelligence/explainability";
import { buildMarketConsensus, buildRecommendationTransitions, buildWhatMustChange, buildWhyNow } from "@/lib/intelligence/decision-engines";
import { recordMemoryFromAnalysis } from "@/lib/learning/memory";

function scoreToRecommendation(score: number): Recommendation {
  if (score >= 65) return "buy";
  if (score <= 35) return "sell";
  return "hold";
}

function scoreToRisk(score: number, vol: number): RiskLevel {
  const risk = (100 - score) * 0.4 + vol * 100;
  if (risk > 75) return "critical";
  if (risk > 55) return "high";
  if (risk > 35) return "medium";
  return "low";
}

export { computeTechnical };

export function computeSignalScore(symbol: string, bars: MarketBar[], price?: number, changePct?: number): AISignalScore {
  const technical = computeTechnical(bars);
  let score = 50;

  if (technical.trend === "bullish") score += 15;
  if (technical.trend === "bearish") score -= 15;
  if (technical.rsi < 30) score += 10;
  if (technical.rsi > 70) score -= 10;
  if (technical.macdSignal === "positive") score += 8;
  if (technical.macdSignal === "negative") score -= 8;
  if (technical.volumeTrend === "rising" && technical.trend === "bullish") score += 5;
  if (technical.trendStrength > 60) score += 5;
  if (technical.trendStrength < 40) score -= 5;

  score = Math.max(5, Math.min(95, score + (hashSymbol(symbol) % 11) - 5));
  const confidence = Number((0.55 + (hashSymbol(symbol + "conf") % 40) / 100).toFixed(2));
  const asset = getMockAsset(symbol);
  const vol = technical.volatility || (asset.assetClass === "crypto" ? 0.6 : 0.35);

  return {
    symbol,
    score: Number(score.toFixed(0)),
    confidence,
    riskLevel: scoreToRisk(score, vol),
    recommendation: scoreToRecommendation(score),
    price: price ?? asset.price,
    changePct: changePct ?? asset.changePct,
  };
}

export async function runAIAnalysis(symbol: string, locale: "ar" | "en" = "ar"): Promise<AIAnalysis> {
  const candleResult = await unifiedCandles(symbol, "1Day", 90);
  const bars: MarketBar[] = candleResult.data.map(({ source, isDemoData, ...bar }) => bar);
  const quoteResult = await unifiedQuote(symbol);
  const technical = computeTechnical(bars);
  const signal = computeSignalScore(symbol, bars, quoteResult.data.price, quoteResult.data.changePct);
  const newsResult = await fetchNews(symbol);
  const economicResult = await fetchEconomicCalendar();
  const sectorImpact = getSectorImpact(symbol);
  const meta = MOCK_UNIVERSE[symbol];
  const isDemo = candleResult.isDemoData && quoteResult.isDemoData;

  const newsSentiment =
    newsResult.items.reduce((s, n) => s + (n.sentiment === "positive" ? 1 : n.sentiment === "negative" ? -1 : 0), 0) /
    Math.max(newsResult.items.length, 1);

  const oilImpact = meta?.assetClass === "saudi" || meta?.assetClass === "commodity" || symbol === "2222" ? 0.35 : 0.12;
  const ratesImpact = meta?.assetClass === "forex" ? -0.28 : -0.15;

  const correlations = [
    { index: "SPY", correlation: Number((0.3 + (hashSymbol(symbol) % 60) / 100).toFixed(2)) },
    { index: "BTCUSD", correlation: Number((0.1 + (hashSymbol(symbol + "btc") % 50) / 100).toFixed(2)) },
    { index: "Oil (Brent)", correlation: meta?.assetClass === "saudi" || meta?.assetClass === "commodity" ? 0.72 : 0.25 },
  ];

  const explanationEn: string[] = [
    `Technical: ${technical.summary}. Support ${technical.support}, resistance ${technical.resistance}. Volatility ${(technical.volatility * 100).toFixed(1)}%.`,
    `Volume trend: ${technical.volumeTrend}. Trend strength ${technical.trendStrength}/100. MACD histogram ${technical.macdHistogram}.`,
    `News sentiment ${newsSentiment > 0 ? "positive" : newsSentiment < 0 ? "negative" : "neutral"} (${newsResult.source}${newsResult.isDemoData ? " · demo" : ""}).`,
    `${sectorImpact.sector}: ${sectorImpact.summary}`,
    `Correlation SPY ${(correlations[0].correlation * 100).toFixed(0)}%. Oil ${(oilImpact * 100).toFixed(0)}%. Rates ${(Math.abs(ratesImpact) * 100).toFixed(0)}%.`,
    `Macro: ${economicResult.events[0]?.title ?? "N/A"} (${economicResult.isDemoData ? "demo calendar" : "live"}).`,
    `Signal ${signal.score}/100 → ${signal.recommendation.toUpperCase()} · confidence ${(signal.confidence * 100).toFixed(0)}% · risk ${signal.riskLevel}. Data: ${isDemo ? "demo fallback" : quoteResult.source}. Paper only.`,
  ];

  const recAr = signal.recommendation === "buy" ? "شراء" : signal.recommendation === "sell" ? "بيع" : "احتفاظ";
  const explanationAr: string[] = [
    `فني: ${technical.summary}. الدعم ${technical.support}، المقاومة ${technical.resistance}. التقلب ${(technical.volatility * 100).toFixed(1)}%.`,
    `حجم التداول: ${technical.volumeTrend === "rising" ? "صاعد" : technical.volumeTrend === "falling" ? "هابط" : "مستقر"}. قوة الاتجاه ${technical.trendStrength}/100.`,
    `مزاج الأخبار ${newsSentiment > 0 ? "إيجابي" : newsSentiment < 0 ? "سلبي" : "محايد"} (${newsResult.isDemoData ? "بيانات تجريبية" : "مباشر"}).`,
    `قطاع ${sectorImpact.sector}: ${sectorImpact.summary}`,
    `ارتباط SPY ${(correlations[0].correlation * 100).toFixed(0)}%. النفط ${(oilImpact * 100).toFixed(0)}%.`,
    `ماكرو: ${economicResult.events[0]?.title ?? "—"}.`,
    `الإشارة ${signal.score}/100 → ${recAr} · ثقة ${(signal.confidence * 100).toFixed(0)}% · مخاطر ${signal.riskLevel}. ${isDemo ? "بيانات تجريبية" : "بيانات حية"}. تداول ورقي فقط.`,
  ];

  const explainability = buildExplainability(
    {
      symbol,
      recommendation: signal.recommendation,
      confidence: signal.confidence,
      riskLevel: signal.riskLevel,
      signalScore: signal.score,
      technical,
      newsImpact: newsResult.items,
      sectorImpact,
      macroFactors: { oilImpact, ratesImpact, economicEvents: economicResult.events },
      marketCorrelation: correlations,
    },
    isDemo,
    quoteResult.source
  );

  const engineCtx = {
    symbol,
    recommendation: signal.recommendation,
    confidence: signal.confidence,
    signalScore: signal.score,
    technical,
    newsSentiment,
    sectorStrength: 50 + sectorImpact.impact * 30,
    oilImpact,
    ratesImpact,
    nextEvent: economicResult.events[0]?.title,
  };

  const whyNow = buildWhyNow(engineCtx);
  const whatMustChange = buildWhatMustChange(engineCtx);
  const recommendationTransitions = buildRecommendationTransitions(signal.recommendation, engineCtx);
  const marketConsensus = buildMarketConsensus({ ...engineCtx, riskLevel: signal.riskLevel, aiScore: signal.score });

  logRecommendation({
    symbol,
    recommendation: signal.recommendation,
    confidence: signal.confidence,
    riskLevel: signal.riskLevel,
    dataSource: isDemo ? "demo" : "live",
    provider: quoteResult.source,
    locale,
    summary: explanationEn[explanationEn.length - 1],
  });

  const result: AIAnalysis = {
    symbol,
    assetClass: meta?.assetClass ?? quoteResult.data.assetClass,
    generatedAt: new Date().toISOString(),
    recommendation: signal.recommendation,
    confidence: signal.confidence,
    riskLevel: signal.riskLevel,
    signalScore: signal.score,
    technical,
    newsImpact: newsResult.items,
    sectorImpact,
    marketCorrelation: correlations,
    macroFactors: { oilImpact, ratesImpact, economicEvents: economicResult.events },
    explainability,
    whyNow,
    whatMustChange,
    recommendationTransitions,
    marketConsensus,
    explanation: locale === "ar" ? explanationAr : explanationEn,
    explanationAr,
    complianceNote: locale === "ar" ? COMPLIANCE_CONFIG.financialAdviceDisclaimerAr : COMPLIANCE_CONFIG.financialAdviceDisclaimer,
    complianceNoteAr: COMPLIANCE_CONFIG.financialAdviceDisclaimerAr,
  };

  recordMemoryFromAnalysis(result, isDemo, quoteResult.data.price);
  return result;
}

export async function scanAllSignals(symbols: string[]): Promise<AISignalScore[]> {
  const results = await Promise.all(
    symbols.map(async (s) => {
      const candles = await unifiedCandles(s, "1Day", 60);
      const quote = await unifiedQuote(s);
      return computeSignalScore(s, candles.data, quote.data.price, quote.data.changePct);
    })
  );
  return results;
}
