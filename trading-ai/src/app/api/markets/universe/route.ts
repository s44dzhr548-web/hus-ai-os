import { NextResponse } from "next/server";
import { ASSET_UNIVERSE, UNIVERSE_STATS, getAssetsByMarketTab } from "@/lib/markets/asset-universe";
import type { MarketCategory } from "@/lib/markets/asset-universe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "all") as MarketCategory;

  const assets = getAssetsByMarketTab(category);

  return NextResponse.json({
    total: ASSET_UNIVERSE.length,
    active: assets.length,
    category,
    stats: UNIVERSE_STATS,
    assets: assets.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      displaySymbol: a.displaySymbol,
      name: a.name,
      market: a.market,
      category: a.category,
      exchange: a.exchange,
      sector: a.sector,
      industry: a.industry,
      country: a.country,
      currency: a.currency,
      provider: a.provider,
      isActive: a.isActive,
    })),
  });
}
