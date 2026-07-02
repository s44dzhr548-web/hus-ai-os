import { NextResponse } from "next/server";
import { unifiedCandles } from "@/lib/market/unified";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const timeframe = searchParams.get("timeframe") ?? "1Day";
  const limit = Number(searchParams.get("limit") ?? 90);
  const result = await unifiedCandles(symbol, timeframe, limit);
  return NextResponse.json(result);
}
