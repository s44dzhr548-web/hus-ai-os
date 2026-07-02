import type { MarketBar, StrategyLabResult } from "@/types/trading";
import { runBacktest, type StrategyFn } from "@/lib/backtest/engine";
import { smaCrossoverStrategy } from "@/lib/strategies/sma-crossover";
import { rsiStrategy } from "@/lib/strategies/rsi-strategy";
import { computeTechnical } from "@/lib/market/indicators";
import { unifiedCandles } from "@/lib/market/unified";

function macdStrategy(bars: MarketBar[]) {
  const t = computeTechnical(bars);
  if (t.macdSignal === "positive" && t.rsi < 70) return { symbol: bars[0]?.symbol ?? "", strategy: "macd", direction: "long" as const, strength: 70, price_at_signal: bars[bars.length - 1].close };
  if (t.macdSignal === "negative" && t.rsi > 30) return { symbol: bars[0]?.symbol ?? "", strategy: "macd", direction: "short" as const, strength: 70, price_at_signal: bars[bars.length - 1].close };
  return null;
}

function maStrategy(bars: MarketBar[]) {
  const t = computeTechnical(bars);
  if (t.trend === "bullish" && bars[bars.length - 1].close > t.sma20) return { symbol: bars[0]?.symbol ?? "", strategy: "ma", direction: "long" as const, strength: 65, price_at_signal: bars[bars.length - 1].close };
  if (t.trend === "bearish" && bars[bars.length - 1].close < t.sma20) return { symbol: bars[0]?.symbol ?? "", strategy: "ma", direction: "short" as const, strength: 65, price_at_signal: bars[bars.length - 1].close };
  return null;
}

function breakoutStrategy(bars: MarketBar[]) {
  const t = computeTechnical(bars);
  const price = bars[bars.length - 1].close;
  if (price > t.resistance * 0.998) return { symbol: bars[0]?.symbol ?? "", strategy: "breakout", direction: "long" as const, strength: 75, price_at_signal: price };
  if (price < t.support * 1.002) return { symbol: bars[0]?.symbol ?? "", strategy: "breakout", direction: "short" as const, strength: 75, price_at_signal: price };
  return null;
}

function meanReversionStrategy(bars: MarketBar[]) {
  const t = computeTechnical(bars);
  if (t.rsi < 32) return { symbol: bars[0]?.symbol ?? "", strategy: "mean-rev", direction: "long" as const, strength: 60, price_at_signal: bars[bars.length - 1].close };
  if (t.rsi > 68) return { symbol: bars[0]?.symbol ?? "", strategy: "mean-rev", direction: "short" as const, strength: 60, price_at_signal: bars[bars.length - 1].close };
  return null;
}

function newsStrategy(bars: MarketBar[]) {
  const t = computeTechnical(bars);
  if (t.volumeTrend === "rising" && t.trendStrength > 55) return { symbol: bars[0]?.symbol ?? "", strategy: "news", direction: "long" as const, strength: 55, price_at_signal: bars[bars.length - 1].close };
  return null;
}

function aiStrategy(bars: MarketBar[]) {
  const t = computeTechnical(bars);
  let score = 50;
  if (t.trend === "bullish") score += 15;
  if (t.rsi < 35) score += 10;
  if (t.macdSignal === "positive") score += 10;
  if (score >= 65) return { symbol: bars[0]?.symbol ?? "", strategy: "ai", direction: "long" as const, strength: score, price_at_signal: bars[bars.length - 1].close };
  if (score <= 35) return { symbol: bars[0]?.symbol ?? "", strategy: "ai", direction: "short" as const, strength: 100 - score, price_at_signal: bars[bars.length - 1].close };
  return null;
}

const STRATEGY_DEFS: { id: string; nameEn: string; nameAr: string; fn: StrategyFn }[] = [
  { id: "rsi", nameEn: "RSI", nameAr: "RSI", fn: rsiStrategy },
  { id: "macd", nameEn: "MACD", nameAr: "MACD", fn: macdStrategy },
  { id: "ma", nameEn: "Moving Average", nameAr: "متوسط متحرك", fn: maStrategy },
  { id: "breakout", nameEn: "Breakout", nameAr: "اختراق", fn: breakoutStrategy },
  { id: "mean-reversion", nameEn: "Mean Reversion", nameAr: "عودة للمتوسط", fn: meanReversionStrategy },
  { id: "news", nameEn: "News Strategy", nameAr: "استراتيجية الأخبار", fn: newsStrategy },
  { id: "ai", nameEn: "AI Strategy", nameAr: "استراتيجية AI", fn: aiStrategy },
  { id: "sma-crossover", nameEn: "SMA Crossover", nameAr: "تقاطع SMA", fn: smaCrossoverStrategy },
];

export async function runStrategyLab(symbol: string, initialCapital = 100_000): Promise<StrategyLabResult> {
  const candles = await unifiedCandles(symbol, "1Day", 120);
  const bars: MarketBar[] = candles.data.map(({ source, isDemoData, ...bar }) => bar);

  const strategies = STRATEGY_DEFS.map(({ id, nameEn, nameAr, fn }) => {
    const result = runBacktest(bars, initialCapital, fn);
    return {
      id,
      nameEn,
      nameAr,
      winRate: result.winRate,
      totalReturnPct: result.totalReturnPct,
      maxDrawdownPct: result.maxDrawdownPct,
      sharpeLike: result.sharpeRatio,
      trades: result.trades,
    };
  }).sort((a, b) => b.totalReturnPct - a.totalReturnPct);

  return { symbol, strategies };
}
