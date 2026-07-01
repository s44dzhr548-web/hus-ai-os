import { NextResponse } from "next/server";
import { fetchBars } from "@/lib/alpaca/client";
import { compareStrategies, hashBacktestResult, runBacktest, STRATEGIES } from "@/lib/backtest/engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const strategy = searchParams.get("strategy") ?? "sma-crossover";
  const compare = searchParams.get("compare") === "1";
  const capital = Number(searchParams.get("capital") ?? 100_000);

  const bars = await fetchBars(symbol);

  if (compare) {
    const comparisons = compareStrategies(bars, capital);
    return NextResponse.json({ symbol, comparisons, mode: process.env.ALPACA_API_KEY ? "live" : "mock" });
  }

  const fn = STRATEGIES[strategy] ?? STRATEGIES["sma-crossover"];
  const result = runBacktest(bars, capital, fn);

  return NextResponse.json({
    symbol,
    strategy,
    result,
    reproducibilityHash: hashBacktestResult(result),
    mode: process.env.ALPACA_API_KEY ? "live" : "mock",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { symbol?: string; strategy?: string; capital?: number };
  const symbol = (body.symbol ?? "AAPL").toUpperCase();
  const strategy = body.strategy ?? "sma-crossover";
  const capital = body.capital ?? 100_000;
  const bars = await fetchBars(symbol);
  const fn = STRATEGIES[strategy] ?? STRATEGIES["sma-crossover"];
  const result = runBacktest(bars, capital, fn);

  return NextResponse.json({
    symbol,
    strategy,
    result,
    reproducibilityHash: hashBacktestResult(result),
  });
}
