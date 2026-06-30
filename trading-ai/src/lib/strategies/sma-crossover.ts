import type { MarketBar, Signal } from "@/types/trading";

/** Simple moving average crossover strategy */
export function smaCrossoverStrategy(
  bars: MarketBar[],
  shortPeriod = 5,
  longPeriod = 20
): Signal | null {
  if (bars.length < longPeriod) return null;

  const closes = bars.map((b) => b.close);
  const symbol = bars[bars.length - 1].symbol;
  const price = closes[closes.length - 1];

  const sma = (period: number) => {
    const slice = closes.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };

  const shortSma = sma(shortPeriod);
  const longSma = sma(longPeriod);
  const prevShort = closes.slice(-shortPeriod - 1, -1).reduce((a, b) => a + b, 0) / shortPeriod;
  const prevLong = closes.slice(-longPeriod - 1, -1).reduce((a, b) => a + b, 0) / longPeriod;

  let direction: Signal["direction"] = "neutral";
  let strength = 0;

  if (prevShort <= prevLong && shortSma > longSma) {
    direction = "long";
    strength = Math.min(1, (shortSma - longSma) / longSma);
  } else if (prevShort >= prevLong && shortSma < longSma) {
    direction = "short";
    strength = Math.min(1, (longSma - shortSma) / longSma);
  }

  if (direction === "neutral") return null;

  return {
    symbol,
    strategy: "sma_crossover",
    direction,
    strength: Number(strength.toFixed(4)),
    price_at_signal: price,
    metadata: { shortSma, longSma, shortPeriod, longPeriod },
  };
}

/** Generate signals for multiple symbols */
export function scanSymbols(
  data: Record<string, MarketBar[]>
): Signal[] {
  return Object.values(data)
    .map((bars) => smaCrossoverStrategy(bars))
    .filter((s): s is Signal => s !== null);
}
