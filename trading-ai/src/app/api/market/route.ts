import { NextResponse } from "next/server";
import { DEFAULT_WATCHLIST, getMockMarketOverview } from "@/lib/data/mock-market";
import { getDataMode } from "@/lib/data/adapters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",").map((s) => s.trim().toUpperCase());

  return NextResponse.json({
    ...getMockMarketOverview(symbols),
    mode: getDataMode(),
    watchlist: DEFAULT_WATCHLIST,
  });
}
