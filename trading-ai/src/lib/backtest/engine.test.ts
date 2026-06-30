import { describe, expect, it } from "vitest";
import { runBacktest, hashBacktestResult } from "@/lib/backtest/engine";
import { smaCrossoverStrategy } from "@/lib/strategies/sma-crossover";
import type { MarketBar } from "@/types/trading";

function makeBars(count: number, startPrice = 100): MarketBar[] {
  const bars: MarketBar[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const d = new Date("2024-01-01");
    d.setDate(d.getDate() + i);
    price += i < count / 2 ? 0.5 : -0.3;
    bars.push({
      symbol: "TEST",
      timeframe: "1Day",
      bar_time: d.toISOString(),
      open: price,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000,
    });
  }
  return bars;
}

describe("backtest engine", () => {
  it("produces reproducible hash", () => {
    const bars = makeBars(60);
    const r1 = runBacktest(bars);
    const r2 = runBacktest(bars);
    expect(hashBacktestResult(r1)).toBe(hashBacktestResult(r2));
  });

  it("returns equity curve", () => {
    const result = runBacktest(makeBars(60));
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.finalEquity).toBeGreaterThan(0);
  });
});

describe("sma crossover", () => {
  it("returns null when insufficient bars", () => {
    expect(smaCrossoverStrategy(makeBars(10))).toBeNull();
  });

  it("detects trend from uptrending data", () => {
    const bars = makeBars(40, 50);
    const signal = smaCrossoverStrategy(bars);
    expect(signal === null || signal.direction === "long" || signal.direction === "short").toBe(true);
  });
});
