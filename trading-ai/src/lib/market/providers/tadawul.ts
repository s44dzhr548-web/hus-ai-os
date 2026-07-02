import type { MarketDataProvider } from "../types";
import { envKey, hasKey } from "../config";
import { getCatalogEntry, searchCatalog } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";
import { yahooProvider } from "./yahoo";

export const tadawulProvider: MarketDataProvider = {
  id: "tadawul",
  name: "Tadawul / Saudi Market",
  assetClasses: ["saudi"],
  isConfigured: () => hasKey("TADAWUL_PROVIDER_KEY"),
  async searchSymbols(query, limit = 10) {
    return searchCatalog(query, limit).filter((s) => s.assetClass === "saudi");
  },
  async getQuote(symbol) {
    if (hasKey("TADAWUL_PROVIDER_KEY")) {
      // Custom Tadawul API placeholder — falls through to Yahoo .SR suffix
    }
    return yahooProvider.getQuote(symbol);
  },
  async getCandles(symbol, timeframe, limit) {
    if (hasKey("TADAWUL_PROVIDER_KEY")) {
      const key = envKey("TADAWUL_PROVIDER_KEY");
      void key;
    }
    return yahooProvider.getCandles(symbol, timeframe, limit);
  },
  async getMarketStatus() {
    return mockProvider.getMarketStatus("Tadawul");
  },
};

export function saudiQuoteFallback(symbol: string) {
  const meta = getCatalogEntry(symbol);
  if (!meta) return null;
  return wrapQuote(
    {
      symbol,
      name: meta.name,
      assetClass: "saudi",
      exchange: "Tadawul",
      currency: "SAR",
      price: 0,
      changePct: 0,
      volume: 0,
    },
    "tadawul",
    true
  );
}
