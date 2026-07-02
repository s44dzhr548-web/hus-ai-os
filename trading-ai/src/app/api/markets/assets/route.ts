import { NextResponse } from "next/server";
import { browseMarkets, type MarketSortOption } from "@/lib/market/markets-browser";
import { UNIVERSE_STATS, getAssetsByMarketTab } from "@/lib/markets/asset-universe";
import { resolveMarketCategoryFromQuery } from "@/lib/markets/assets-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = resolveMarketCategoryFromQuery(searchParams);
  const search = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? searchParams.get("limit") ?? 50);
  const sort = (searchParams.get("sort") ?? "ai_opportunity") as MarketSortOption;
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";
  const ranked = searchParams.get("ranked") !== "0";

  const meta = getAssetsByMarketTab(category, search);

  if (!ranked) {
    return NextResponse.json({
      category,
      market: searchParams.get("market") ?? null,
      filterCategory: searchParams.get("category") ?? null,
      total: meta.length,
      universeTotal: UNIVERSE_STATS.total,
      stats: UNIVERSE_STATS,
      assets: meta.map((a) => ({
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

  const result = await browseMarkets({ category, sort, search, page, pageSize: Math.min(100, pageSize) });
  const assets = result.items.map((item) => ({
    id: item.symbol,
    symbol: item.symbol,
    displaySymbol: item.displaySymbol,
    name: item.name,
    market: item.market,
    category: item.category,
    exchange: item.exchange,
    sector: item.sector,
    price: item.price,
    changePct: item.changePct,
    aiOpportunityScore: item.aiOpportunityScore,
    expectedReturn: item.expectedReturnPct,
    riskScore: item.riskScore,
    confidence: item.aiConfidence,
    recommendation: item.recommendation,
    reason: lang === "ar" ? item.whySelectedAr : item.whySelected,
    dataSource: item.dataSource,
    rank: item.rank,
  }));

  return NextResponse.json({
    category,
    market: searchParams.get("market") ?? null,
    filterCategory: searchParams.get("category") ?? null,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    universeTotal: result.universeTotal,
    stats: UNIVERSE_STATS,
    assets,
  });
}
