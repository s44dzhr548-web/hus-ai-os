import type {
  AIAnalysis,
  AssetClass,
  ConfidenceAnalytics,
  LearningRecord,
  LearningStats,
  PortfolioSimulationResult,
  Recommendation,
  RiskLevel,
} from "@/types/trading";
import { assetClassForSymbol } from "@/lib/market/catalog";
import { unifiedQuote } from "@/lib/market/unified";
import { hashSymbol } from "@/lib/data/seed";

const SEED: LearningRecord[] = [
  {
    id: "lr-001",
    symbol: "AAPL",
    assetClass: "stock",
    recommendation: "buy",
    predictedDirection: "up",
    actualDirection: "up",
    confidence: 0.72,
    riskLevel: "medium",
    reasons: ["Bullish MACD crossover", "Positive news sentiment"],
    priceAtRecommendation: 178,
    pricesAfter: { d1: 180.2, w1: 182.5 },
    returnPct: 2.5,
    wasCorrect: true,
    dataSource: "demo",
    recordedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "lr-002",
    symbol: "TSLA",
    assetClass: "stock",
    recommendation: "sell",
    predictedDirection: "down",
    actualDirection: "up",
    confidence: 0.61,
    riskLevel: "high",
    reasons: ["Overbought RSI", "Negative sector momentum"],
    priceAtRecommendation: 248,
    pricesAfter: { d1: 255 },
    returnPct: -2.8,
    wasCorrect: false,
    mistake: "Missed earnings catalyst",
    mistakeCategory: "news",
    lessonLearned: "Weight earnings calendar higher before short bias",
    improvedRule: "Reduce sell conviction within 48h of earnings",
    dataSource: "demo",
    recordedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "lr-003",
    symbol: "2222",
    assetClass: "saudi",
    recommendation: "hold",
    predictedDirection: "flat",
    actualDirection: "flat",
    confidence: 0.58,
    riskLevel: "low",
    reasons: ["Oil correlation neutral", "Range-bound technicals"],
    priceAtRecommendation: 28.5,
    pricesAfter: { d1: 28.7, w1: 28.4 },
    returnPct: 0.7,
    wasCorrect: true,
    dataSource: "demo",
    recordedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "lr-004",
    symbol: "BTCUSD",
    assetClass: "crypto",
    recommendation: "buy",
    predictedDirection: "up",
    actualDirection: "up",
    confidence: 0.68,
    riskLevel: "high",
    reasons: ["Risk-on sentiment", "Volume rising"],
    priceAtRecommendation: 67000,
    pricesAfter: { d1: 68500, w1: 70200 },
    returnPct: 4.8,
    wasCorrect: true,
    dataSource: "demo",
    recordedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: "lr-005",
    symbol: "NVDA",
    assetClass: "stock",
    recommendation: "buy",
    predictedDirection: "up",
    actualDirection: "down",
    confidence: 0.55,
    riskLevel: "medium",
    reasons: ["AI sector momentum"],
    priceAtRecommendation: 875,
    pricesAfter: { d1: 860 },
    returnPct: -1.7,
    wasCorrect: false,
    mistakeCategory: "timing",
    lessonLearned: "High RSI reduced edge",
    improvedRule: "Require RSI < 65 for buy in extended trends",
    dataSource: "demo",
    recordedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

let records: LearningRecord[] = [...SEED];

function directionFromReturn(pct: number): "up" | "down" | "flat" {
  if (pct > 1) return "up";
  if (pct < -1) return "down";
  return "flat";
}

function predictedFromRec(rec: Recommendation): "up" | "down" | "flat" {
  if (rec === "buy") return "up";
  if (rec === "sell") return "down";
  return "flat";
}

export function recordMemoryFromAnalysis(
  analysis: AIAnalysis,
  isDemo: boolean,
  priceAtRecommendation?: number
): LearningRecord {
  const record: LearningRecord = {
    id: `lr-${Date.now()}-${hashSymbol(analysis.symbol) % 1000}`,
    symbol: analysis.symbol,
    assetClass: analysis.assetClass,
    recommendation: analysis.recommendation,
    predictedDirection: predictedFromRec(analysis.recommendation),
    actualDirection: "flat",
    confidence: analysis.confidence,
    riskLevel: analysis.riskLevel,
    reasons: analysis.explanation.slice(0, 4),
    priceAtRecommendation: priceAtRecommendation ?? analysis.technical.sma20,
    wasCorrect: false,
    dataSource: isDemo ? "demo" : "live",
    recordedAt: new Date().toISOString(),
  };
  records.unshift(record);
  if (records.length > 200) records = records.slice(0, 200);
  return record;
}

export async function resolvePendingRecords(): Promise<number> {
  let resolved = 0;
  const now = Date.now();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.resolvedAt) continue;
    const age = now - new Date(r.recordedAt).getTime();
    if (age < 86400000) continue;
    try {
      const quote = await unifiedQuote(r.symbol);
      const price = quote.data.price;
      const base = r.priceAtRecommendation || price;
      const returnPct = base > 0 ? ((price - base) / base) * 100 : 0;
      const actual = directionFromReturn(returnPct);
      const wasCorrect =
        (r.predictedDirection === "up" && returnPct > 0) ||
        (r.predictedDirection === "down" && returnPct < 0) ||
        (r.predictedDirection === "flat" && Math.abs(returnPct) <= 1);
      records[i] = {
        ...r,
        actualDirection: actual,
        returnPct: Number(returnPct.toFixed(2)),
        pricesAfter: { ...r.pricesAfter, d1: price },
        wasCorrect,
        resolvedAt: new Date().toISOString(),
        mistake: wasCorrect ? undefined : `Predicted ${r.predictedDirection}, got ${actual} (${returnPct.toFixed(1)}%)`,
        mistakeCategory: wasCorrect ? undefined : r.mistakeCategory ?? "technical",
        lessonLearned: wasCorrect ? r.lessonLearned : `Review ${r.symbol} ${r.recommendation} signal thresholds`,
        improvedRule: wasCorrect ? r.improvedRule : `Tighten ${r.recommendation} filters when confidence < 60%`,
      };
      resolved++;
    } catch {
      /* skip */
    }
  }
  return resolved;
}

export function getAllMemoryRecords(): LearningRecord[] {
  return [...records];
}

export function getLearningStats(): LearningStats {
  const resolved = records.filter((r) => r.resolvedAt);
  const correct = resolved.filter((r) => r.wasCorrect).length;
  const recent = resolved.slice(0, 5);
  const older = resolved.slice(5, 10);
  const recentAcc = recent.length ? recent.filter((r) => r.wasCorrect).length / recent.length : 0;
  const olderAcc = older.length ? older.filter((r) => r.wasCorrect).length / older.length : 0;
  return {
    totalPredictions: resolved.length,
    correct,
    accuracy: resolved.length ? Number(((correct / resolved.length) * 100).toFixed(1)) : 0,
    recentMistakes: records.filter((r) => r.mistake).slice(0, 5),
    improvementTrend: Number(((recentAcc - olderAcc) * 100).toFixed(1)),
  };
}

function winRate(items: LearningRecord[]): number {
  const resolved = items.filter((r) => r.resolvedAt);
  if (!resolved.length) return 0;
  return Number(((resolved.filter((r) => r.wasCorrect).length / resolved.length) * 100).toFixed(1));
}

export function getConfidenceAnalytics(): ConfidenceAnalytics {
  const resolved = records.filter((r) => r.resolvedAt);
  const ranges = [
    { label: "50-60%", min: 0.5, max: 0.6 },
    { label: "60-70%", min: 0.6, max: 0.7 },
    { label: "70-80%", min: 0.7, max: 0.8 },
    { label: "80%+", min: 0.8, max: 1.01 },
  ];
  const winRateByConfidence = ranges.map(({ label, min, max }) => {
    const subset = resolved.filter((r) => r.confidence >= min && r.confidence < max);
    return { range: label, total: subset.length, correct: subset.filter((r) => r.wasCorrect).length, winRate: winRate(subset) };
  });
  const markets = ["stock", "saudi", "crypto", "forex", "etf"] as AssetClass[];
  const winRateByMarket = markets.map((m) => {
    const subset = resolved.filter((r) => (r.assetClass ?? assetClassForSymbol(r.symbol)) === m);
    return { market: m, total: subset.length, correct: subset.filter((r) => r.wasCorrect).length, winRate: winRate(subset) };
  }).filter((x) => x.total > 0);
  const risks: RiskLevel[] = ["low", "medium", "high", "critical"];
  const winRateByRisk = risks.map((risk) => {
    const subset = resolved.filter((r) => r.riskLevel === risk);
    return { risk, total: subset.length, correct: subset.filter((r) => r.wasCorrect).length, winRate: winRate(subset) };
  }).filter((x) => x.total > 0);
  const returns = resolved.filter((r) => r.returnPct != null).map((r) => r.returnPct!);
  const avgReturnAfterRecommendation = returns.length ? Number((returns.reduce((a, b) => a + b, 0) / returns.length).toFixed(2)) : 0;
  const byRec: Recommendation[] = ["buy", "hold", "sell"];
  const recStats = byRec.map((rec) => ({ recommendation: rec, winRate: winRate(resolved.filter((r) => r.recommendation === rec)) }));
  const sorted = recStats.filter((r) => r.winRate > 0).sort((a, b) => b.winRate - a.winRate);
  return {
    winRateByConfidence,
    winRateByMarket,
    winRateByRisk,
    winRateByStrategy: [{ strategy: "AI composite", total: resolved.length, correct: resolved.filter((r) => r.wasCorrect).length, winRate: winRate(resolved) }],
    avgReturnAfterRecommendation,
    accuracyTrend: [
      { period: "Last 7d", accuracy: winRate(resolved.filter((r) => Date.now() - new Date(r.recordedAt).getTime() < 7 * 86400000)) },
      { period: "Last 30d", accuracy: winRate(resolved) },
    ],
    bestType: sorted[0] ?? { recommendation: "hold", winRate: 0 },
    worstType: sorted[sorted.length - 1] ?? { recommendation: "sell", winRate: 0 },
  };
}

export async function simulatePortfolioFollowingAI(initialCapital = 100_000): Promise<PortfolioSimulationResult> {
  const resolved = records.filter((r) => r.resolvedAt && r.returnPct != null && r.recommendation !== "hold");
  let cash = initialCapital;
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  const positionPct = 0.1;
  const trades: { symbol: string; pnlPct: number; date: string }[] = [];
  const equityCurve: { date: string; equity: number }[] = [];

  for (const r of resolved.slice().reverse()) {
    if (r.recommendation === "hold") continue;
    const alloc = equity * positionPct;
    const signedReturn = r.recommendation === "buy" ? (r.returnPct ?? 0) : -(r.returnPct ?? 0);
    const pnl = alloc * (signedReturn / 100);
    equity += pnl;
    cash += pnl;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
    trades.push({ symbol: r.symbol, pnlPct: Number(signedReturn.toFixed(2)), date: r.resolvedAt!.split("T")[0] });
    equityCurve.push({ date: r.resolvedAt!.split("T")[0], equity: Number(equity.toFixed(2)) });
  }

  const buyHoldReturnPct = 8.5;
  const indexBenchmarkReturnPct = 10.2;
  const winning = trades.filter((t) => t.pnlPct > 0);
  const sorted = [...trades].sort((a, b) => b.pnlPct - a.pnlPct);

  return {
    initialCapital,
    finalEquity: Number(equity.toFixed(2)),
    totalReturnPct: Number((((equity - initialCapital) / initialCapital) * 100).toFixed(2)),
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
    bestTrade: sorted[0] ? { symbol: sorted[0].symbol, pnlPct: sorted[0].pnlPct } : null,
    worstTrade: sorted[sorted.length - 1] ? { symbol: sorted[sorted.length - 1].symbol, pnlPct: sorted[sorted.length - 1].pnlPct } : null,
    equityCurve,
    buyHoldReturnPct,
    indexBenchmarkReturnPct,
    trades: trades.length,
    winRate: trades.length ? Number(((winning.length / trades.length) * 100).toFixed(1)) : 0,
  };
}
