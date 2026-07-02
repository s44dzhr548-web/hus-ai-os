import { NextResponse } from "next/server";
import type { MarketBar } from "@/types/trading";
import { scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { unifiedCandles } from "@/lib/market/unified";
import { getDataMode } from "@/lib/market/config";
import { scanSymbols } from "@/lib/strategies/sma-crossover";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? DEFAULT_WATCHLIST.join(",");
  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
  const format = searchParams.get("format");

  if (format === "ai") {
    const signals = await scanAllSignals(symbols);
    return NextResponse.json({ symbols, mode: getDataMode(), signals });
  }

  const data: Record<string, MarketBar[]> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const result = await unifiedCandles(symbol, "1Day", 90);
      data[symbol] = result.data.map(({ source, isDemoData, ...bar }) => bar);
    })
  );

  const signals = scanSymbols(data);

  return NextResponse.json({
    symbols,
    mode: getDataMode(),
    signals,
    barCounts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
  });
}
