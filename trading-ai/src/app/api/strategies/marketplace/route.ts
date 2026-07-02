import { NextResponse } from "next/server";
import { getStrategyById, getStrategyMarketplace } from "@/lib/strategies/marketplace";
import { unifiedCandles } from "@/lib/market/unified";
import { runBacktest, STRATEGIES } from "@/lib/backtest/engine";

export async function GET() {
  return NextResponse.json({ strategies: getStrategyMarketplace() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const strategyId = String(body.strategyId ?? "rsi");
  const symbol = String(body.symbol ?? "AAPL").toUpperCase();
  const strategy = getStrategyById(strategyId);
  if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

  const candles = await unifiedCandles(symbol, "1Day", 120);
  const bars = candles.data.map(({ source, isDemoData, ...bar }) => bar);
  const engineKey = strategyId === "ma_cross" ? "sma-crossover" : strategyId === "rsi" ? "rsi" : null;
  const fn = engineKey ? STRATEGIES[engineKey] : undefined;

  if (fn) {
    const result = runBacktest(bars, 100_000, fn);
    return NextResponse.json({ strategy, symbol, backtest: result, isDemoData: candles.isDemoData });
  }

  return NextResponse.json({
    strategy,
    symbol,
    backtest: {
      winRate: strategy.winRate,
      totalReturnPct: strategy.totalReturnPct,
      maxDrawdownPct: strategy.maxDrawdownPct,
      note: "Simulated from marketplace stats — paper only",
    },
    isDemoData: candles.isDemoData,
  });
}
