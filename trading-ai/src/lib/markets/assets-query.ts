import type { MarketCategory } from "./asset-universe";

/** Map /api/markets/assets query params to dashboard market tabs. */
export function resolveMarketCategoryFromQuery(searchParams: URLSearchParams): MarketCategory {
  const market = (searchParams.get("market") ?? "").toLowerCase();
  const category = (searchParams.get("category") ?? "").toLowerCase();

  if (market === "saudi" || market === "tadawul") return "saudi";
  if (market === "usa" || market === "us" || market === "nyse" || market === "nasdaq") return "us";
  if (market === "global") return "global";

  if (category === "crypto") return "crypto";
  if (category === "forex") return "forex";
  if (category === "commodities" || category === "commodity") return "commodity";
  if (category === "gold") return "gold";
  if (category === "oil") return "oil";
  if (category === "etfs" || category === "etf") return "etf";
  if (category === "indices" || category === "index") return "index";
  if (category === "saudi") return "saudi";
  if (category === "usa" || category === "us") return "us";
  if (category === "global") return "global";

  return "all";
}
