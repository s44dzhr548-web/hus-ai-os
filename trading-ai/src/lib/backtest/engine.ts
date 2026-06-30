import type { BacktestResult, MarketBar } from "@/types/trading";
import { smaCrossoverStrategy } from "@/lib/strategies/sma-crossover";

export function runBacktest(
  bars: MarketBar[],
  initialCapital = 100_000
): BacktestResult {
  let cash = initialCapital;
  let shares = 0;
  let peak = initialCapital;
  let maxDrawdown = 0;
  let trades = 0;
  const equityCurve: { date: string; equity: number }[] = [];

  for (let i = 20; i < bars.length; i++) {
    const slice = bars.slice(0, i + 1);
    const signal = smaCrossoverStrategy(slice);
    const bar = bars[i];
    const equity = cash + shares * bar.close;

    if (equity > peak) peak = equity;
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (signal?.direction === "long" && shares === 0 && cash > 0) {
      shares = Math.floor(cash / bar.close);
      cash -= shares * bar.close;
      trades++;
    } else if (signal?.direction === "short" && shares > 0) {
      cash += shares * bar.close;
      shares = 0;
      trades++;
    }

    equityCurve.push({
      date: bar.bar_time.split("T")[0],
      equity: Number((cash + shares * bar.close).toFixed(2)),
    });
  }

  const finalEquity = cash + shares * bars[bars.length - 1].close;
  const totalReturnPct =
    initialCapital > 0
      ? Number((((finalEquity - initialCapital) / initialCapital) * 100).toFixed(6))
      : 0;

  return {
    finalEquity: Number(finalEquity.toFixed(2)),
    totalReturnPct,
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(6)),
    trades,
    equityCurve,
  };
}

/** Verify reproducibility to 6 decimal places */
export function hashBacktestResult(result: BacktestResult): string {
  return [
    result.finalEquity.toFixed(6),
    result.totalReturnPct.toFixed(6),
    result.maxDrawdownPct.toFixed(6),
    result.trades,
  ].join("|");
}
