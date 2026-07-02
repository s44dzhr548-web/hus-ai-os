import { NextResponse } from "next/server";
import { resolveExchange, unifiedMarketStatus } from "@/lib/market/unified";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exchange = searchParams.get("exchange") ?? "NASDAQ";
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const ex = symbol ? resolveExchange(symbol) : exchange;
  const status = await unifiedMarketStatus(ex);
  return NextResponse.json({ ...status, exchange: ex });
}
