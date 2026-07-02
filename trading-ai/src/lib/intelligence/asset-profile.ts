import type { AssetClass, NormalizedAssetProfile } from "@/types/trading";
import { getCatalogEntry } from "@/lib/market/catalog";
import { unifiedQuote } from "@/lib/market/unified";
import { getSectorImpact } from "@/lib/data/mock-news";

export async function getAssetProfile(symbol: string): Promise<NormalizedAssetProfile> {
  const quote = await unifiedQuote(symbol);
  const catalog = getCatalogEntry(symbol);
  const sector = getSectorImpact(symbol).sector;
  return {
    symbol,
    name: catalog?.name ?? quote.data.name,
    assetClass: catalog?.assetClass ?? quote.data.assetClass,
    exchange: catalog?.exchange ?? quote.data.exchange,
    currency: catalog?.currency ?? quote.data.currency,
    region: catalog?.assetClass === "saudi" ? "SA" : catalog?.assetClass === "forex" ? "Global" : "US",
    sector,
    dataSource: quote.isDemoData ? "demo" : "live",
    provider: quote.source,
  };
}

export async function searchAssetProfiles(query: string, limit = 10): Promise<NormalizedAssetProfile[]> {
  const { unifiedSearch } = await import("@/lib/market/unified");
  const results = await unifiedSearch(query, limit);
  return Promise.all(results.map((r) => getAssetProfile(r.symbol)));
}

export function assetClassLabel(ac: AssetClass, locale: "ar" | "en"): string {
  const labels: Record<AssetClass, { en: string; ar: string }> = {
    stock: { en: "Stock", ar: "أسهم" },
    crypto: { en: "Crypto", ar: "عملات رقمية" },
    forex: { en: "Forex", ar: "فوركس" },
    saudi: { en: "Saudi", ar: "سعودي" },
    commodity: { en: "Commodity", ar: "سلع" },
    index: { en: "Index", ar: "مؤشر" },
    etf: { en: "ETF", ar: "ETF" },
  };
  return labels[ac][locale];
}
