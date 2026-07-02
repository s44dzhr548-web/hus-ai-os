import { NextResponse } from "next/server";
import {
  MARKET_CATEGORIES,
  MARKET_SORT_OPTIONS,
  browseMarkets,
  type MarketCategory,
  type MarketSortOption,
} from "@/lib/market/markets-browser";
import { UNIVERSE_STATS, getAssetsByMarketTab } from "@/lib/markets/asset-universe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "all") as MarketCategory;
  const sort = (searchParams.get("sort") ?? "ai_opportunity") as MarketSortOption;
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 12);
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";
  const metaOnly = searchParams.get("meta") === "1";

  if (!MARKET_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!MARKET_SORT_OPTIONS.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }

  if (metaOnly) {
    const assets = getAssetsByMarketTab(category, search);
    return NextResponse.json({
      category,
      total: assets.length,
      universeTotal: UNIVERSE_STATS.total,
      stats: UNIVERSE_STATS,
      symbols: assets.map((a) => ({
        symbol: a.symbol,
        displaySymbol: a.displaySymbol,
        name: a.name,
        market: a.market,
        category: a.category,
        exchange: a.exchange,
      })),
    });
  }

  const result = await browseMarkets({ category, sort, search, page, pageSize });
  const items = result.items.map((item) => ({
    ...item,
    whySelected: lang === "ar" ? item.whySelectedAr : item.whySelected,
  }));

  return NextResponse.json({
    ...result,
    items,
    stats: UNIVERSE_STATS,
    categories: MARKET_CATEGORIES,
    sortOptions: MARKET_SORT_OPTIONS,
  });
}
