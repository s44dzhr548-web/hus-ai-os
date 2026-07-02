import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/market/providers/news";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() ?? "MARKET";
  const result = await fetchNews(symbol);
  return NextResponse.json({
    symbol,
    items: result.items,
    source: result.source,
    isDemoData: result.isDemoData,
  });
}
