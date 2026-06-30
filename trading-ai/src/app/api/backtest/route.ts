import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBars } from "@/lib/alpaca/client";
import { runBacktest, hashBacktestResult } from "@/lib/backtest/engine";

const schema = z.object({
  symbol: z.string().min(1).max(10),
  initialCapital: z.number().positive().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const bars = await fetchBars(parsed.data.symbol.toUpperCase());
  const result = runBacktest(bars, parsed.data.initialCapital ?? 100_000);

  return NextResponse.json({
    symbol: parsed.data.symbol.toUpperCase(),
    mode: process.env.ALPACA_API_KEY ? "live" : "mock",
    result,
    reproducibilityHash: hashBacktestResult(result),
    barCount: bars.length,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const bars = await fetchBars(symbol);
  const result = runBacktest(bars);

  return NextResponse.json({
    symbol,
    result,
    reproducibilityHash: hashBacktestResult(result),
  });
}
