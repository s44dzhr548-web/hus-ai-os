import type { MarketBar, Signal } from "@/types/trading";

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
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function rsiStrategy(bars: MarketBar[]): Signal | null {
  if (bars.length < 20) return null;
  const closes = bars.map((b) => b.close);
  const val = rsi(closes);
  const last = bars[bars.length - 1];

  if (val < 30) {
    return {
      symbol: last.symbol,
      strategy: "rsi",
      direction: "long",
      strength: (30 - val) / 30,
      price_at_signal: last.close,
      metadata: { rsi: val },
    };
  }
  if (val > 70) {
    return {
      symbol: last.symbol,
      strategy: "rsi",
      direction: "short",
      strength: (val - 70) / 30,
      price_at_signal: last.close,
      metadata: { rsi: val },
    };
  }
  return null;
}
