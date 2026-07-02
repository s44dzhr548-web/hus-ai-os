import { NextResponse } from "next/server";
import {
  MARKET_CATEGORIES,
  MARKET_SORT_OPTIONS,
  browseMarkets,
  type MarketCategory,
  type MarketSortOption,
} from "@/lib/market/markets-browser";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "all") as MarketCategory;
  const sort = (searchParams.get("sort") ?? "ai_opportunity") as MarketSortOption;
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 12);
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";

  if (!MARKET_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!MARKET_SORT_OPTIONS.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }

  const result = await browseMarkets({ category, sort, search, page, pageSize });
  const items = result.items.map((item) => ({
    ...item,
    whySelected: lang === "ar" ? item.whySelectedAr : item.whySelected,
  }));

  return NextResponse.json({
    ...result,
    items,
    categories: MARKET_CATEGORIES,
    sortOptions: MARKET_SORT_OPTIONS,
  });
}
