import type {
  AIAnalysis,
  AISignalScore,
  MarketBar,
  Recommendation,
  RiskLevel,
  TechnicalAnalysis,
} from "@/types/trading";
import { generateMockBars, getMockAsset, MOCK_UNIVERSE } from "@/lib/data/mock-market";
import { getMockEconomicEvents, getMockNews, getSectorImpact } from "@/lib/data/mock-news";
import { hashSymbol } from "@/lib/data/seed";
import { COMPLIANCE_CONFIG } from "@/lib/compliance/config";

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period || 0.0001;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeTechnical(bars: MarketBar[]): TechnicalAnalysis {
  const closes = bars.map((b) => b.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsiVal = rsi(closes);
  const last = closes[closes.length - 1];
  const trend =
    last > sma20 && sma20 > sma50 ? "bullish" : last < sma20 && sma20 < sma50 ? "bearish" : "neutral";
  const macdSignal = sma20 > sma50 ? "positive" : sma20 < sma50 ? "negative" : "neutral";
  const recentLow = Math.min(...closes.slice(-20));
  const recentHigh = Math.max(...closes.slice(-20));

  return {
    trend,
    rsi: Number(rsiVal.toFixed(1)),
    sma20: Number(sma20.toFixed(2)),
    sma50: Number(sma50.toFixed(2)),
    macdSignal,
    support: Number(recentLow.toFixed(2)),
    resistance: Number(recentHigh.toFixed(2)),
    summary: `${trend} trend · RSI ${rsiVal.toFixed(0)} · SMA20 ${sma20 > sma50 ? "above" : "below"} SMA50`,
  };
}

function scoreToRecommendation(score: number): Recommendation {
  if (score >= 65) return "buy";
  if (score <= 35) return "sell";
  return "hold";
}

function scoreToRisk(score: number, volatility: number): RiskLevel {
  const risk = (100 - score) * 0.4 + volatility * 100;
  if (risk > 75) return "critical";
  if (risk > 55) return "high";
  if (risk > 35) return "medium";
  return "low";
}

export function computeSignalScore(symbol: string, bars: MarketBar[]): AISignalScore {
  const technical = computeTechnical(bars);
  const asset = getMockAsset(symbol);
  let score = 50;

  if (technical.trend === "bullish") score += 15;
  if (technical.trend === "bearish") score -= 15;
  if (technical.rsi < 30) score += 10;
  if (technical.rsi > 70) score -= 10;
  if (technical.macdSignal === "positive") score += 8;
  if (technical.macdSignal === "negative") score -= 8;

  score = Math.max(5, Math.min(95, score + (hashSymbol(symbol) % 11) - 5));
  const confidence = Number((0.55 + (hashSymbol(symbol + "conf") % 40) / 100).toFixed(2));
  const volatility = asset.assetClass === "crypto" ? 0.6 : asset.assetClass === "forex" ? 0.2 : 0.35;

  return {
    symbol,
    score: Number(score.toFixed(0)),
    confidence,
    riskLevel: scoreToRisk(score, volatility),
    recommendation: scoreToRecommendation(score),
    price: asset.price,
    changePct: asset.changePct,
  };
}

export function runAIAnalysis(symbol: string): AIAnalysis {
  const bars = generateMockBars(symbol, 90);
  const technical = computeTechnical(bars);
  const signal = computeSignalScore(symbol, bars);
  const newsImpact = getMockNews(symbol);
  const sectorImpact = getSectorImpact(symbol);
  const economicEvents = getMockEconomicEvents();
  const meta = MOCK_UNIVERSE[symbol];

  const newsSentiment =
    newsImpact.reduce((s, n) => s + (n.sentiment === "positive" ? 1 : n.sentiment === "negative" ? -1 : 0), 0) /
    Math.max(newsImpact.length, 1);

  const oilImpact = meta?.assetClass === "saudi" || symbol === "2222" ? 0.35 : 0.12;
  const ratesImpact = meta?.assetClass === "forex" ? -0.28 : -0.15;

  const correlations = [
    { index: "SPY", correlation: Number((0.3 + (hashSymbol(symbol) % 60) / 100).toFixed(2)) },
    { index: "BTCUSD", correlation: Number((0.1 + (hashSymbol(symbol + "btc") % 50) / 100).toFixed(2)) },
    { index: "Oil (Brent)", correlation: meta?.assetClass === "saudi" ? 0.72 : 0.25 },
  ];

  const explanation: string[] = [
    `Technical: ${technical.summary}. Support at ${technical.support}, resistance at ${technical.resistance}.`,
    `News sentiment is ${newsSentiment > 0 ? "positive" : newsSentiment < 0 ? "negative" : "neutral"} based on ${newsImpact.length} recent headlines.`,
    `${sectorImpact.sector} sector ${sectorImpact.summary}`,
    `Market correlation with SPY: ${(correlations[0].correlation * 100).toFixed(0)}%. Oil impact factor: ${(oilImpact * 100).toFixed(0)}%. Rates sensitivity: ${(Math.abs(ratesImpact) * 100).toFixed(0)}%.`,
    `Upcoming macro: ${economicEvents[0].title} (${economicEvents[0].impact} impact).`,
    `AI signal score ${signal.score}/100 → ${signal.recommendation.toUpperCase()} with ${(signal.confidence * 100).toFixed(0)}% confidence.`,
  ];

  return {
    symbol,
    assetClass: meta?.assetClass ?? "stock",
    generatedAt: new Date().toISOString(),
    recommendation: signal.recommendation,
    confidence: signal.confidence,
    riskLevel: signal.riskLevel,
    signalScore: signal.score,
    technical,
    newsImpact,
    sectorImpact,
    marketCorrelation: correlations,
    macroFactors: { oilImpact, ratesImpact, economicEvents },
    explanation,
    complianceNote: COMPLIANCE_CONFIG.financialAdviceDisclaimer,
  };
}

export function scanAllSignals(symbols: string[]): AISignalScore[] {
  return symbols.map((s) => computeSignalScore(s, generateMockBars(s, 60)));
}
