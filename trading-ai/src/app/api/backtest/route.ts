import { NextResponse } from "next/server";
import { compareStrategies, exportBacktestReport, hashBacktestResult, runBacktest, STRATEGIES } from "@/lib/backtest/engine";
import { unifiedCandles } from "@/lib/market/unified";
import { getDataMode } from "@/lib/market/config";

async function loadBars(symbol: string) {
  const result = await unifiedCandles(symbol, "1Day", 120);
  return {
    bars: result.data.map(({ source, isDemoData, ...bar }) => bar),
    isDemoData: result.isDemoData,
    source: result.source,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const strategy = searchParams.get("strategy") ?? "sma-crossover";
  const compare = searchParams.get("compare") === "1";
  const exportFmt = searchParams.get("export");
  const capital = Number(searchParams.get("capital") ?? 100_000);

  const { bars, isDemoData, source } = await loadBars(symbol);

  if (exportFmt === "markdown") {
    const comparisons = compareStrategies(bars, capital);
    const report = exportBacktestReport(symbol, comparisons);
    return new NextResponse(report, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  if (compare) {
    const comparisons = compareStrategies(bars, capital);
    return NextResponse.json({
      symbol,
      comparisons,
      mode: getDataMode(),
      dataSource: source,
      isDemoData,
    });
  }

  const fn = STRATEGIES[strategy] ?? STRATEGIES["sma-crossover"];
  const result = runBacktest(bars, capital, fn);

  return NextResponse.json({
    symbol,
    strategy,
    result,
    reproducibilityHash: hashBacktestResult(result),
    mode: getDataMode(),
    dataSource: source,
    isDemoData,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { symbol?: string; strategy?: string; capital?: number };
  const symbol = (body.symbol ?? "AAPL").toUpperCase();
  const strategy = body.strategy ?? "sma-crossover";
  const capital = body.capital ?? 100_000;
  const { bars } = await loadBars(symbol);
  const fn = STRATEGIES[strategy] ?? STRATEGIES["sma-crossover"];
  const result = runBacktest(bars, capital, fn);

  return NextResponse.json({
    symbol,
    strategy,
    result,
    reproducibilityHash: hashBacktestResult(result),
  });
}
