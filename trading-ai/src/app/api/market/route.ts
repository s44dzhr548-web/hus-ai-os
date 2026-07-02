import { NextResponse } from "next/server";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { unifiedOverview } from "@/lib/market/unified";
import { getDataMode } from "@/lib/market/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (
    searchParams.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()) ?? DEFAULT_WATCHLIST
  ).filter(Boolean);

  const overview = await unifiedOverview(symbols);
  return NextResponse.json({
    ...overview,
    mode: overview.mode ?? getDataMode(),
    watchlist: DEFAULT_WATCHLIST,
  });
}
