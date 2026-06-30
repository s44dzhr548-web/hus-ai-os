import { NextResponse } from "next/server";
import { fetchBars } from "@/lib/alpaca/client";
import { scanSymbols } from "@/lib/strategies/sma-crossover";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? "AAPL,MSFT,GOOGL";
  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());

  const data: Record<string, Awaited<ReturnType<typeof fetchBars>>> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      data[symbol] = await fetchBars(symbol);
    })
  );

  const signals = scanSymbols(data);

  return NextResponse.json({
    symbols,
    mode: process.env.ALPACA_API_KEY ? "live" : "mock",
    signals,
    barCounts: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.length])
    ),
  });
}
