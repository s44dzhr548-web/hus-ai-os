import type { MarketDataProvider, MarketStatusInfo } from "../types";
import { getCatalogEntry, searchCatalog } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";
import { yahooProvider } from "./yahoo";
import { getSaudiMarketMode, getSaudiMarketQuote, isSaudiMarketConfigured } from "./saudi-market";

function tadawulSessionStatus(): MarketStatusInfo {
  const now = new Date();
  const riyadh = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const day = riyadh.getDay();
  const hour = riyadh.getHours() + riyadh.getMinutes() / 60;
  const isWeekday = day >= 0 && day <= 4;
  const isOpen = isWeekday && hour >= 10 && hour < 15;
  return {
    exchange: "Tadawul",
    isOpen,
    session: isOpen ? "open" : "closed",
    timezone: "Asia/Riyadh",
    localTime: riyadh.toISOString(),
    nextOpen: isOpen ? undefined : "Sun–Thu 10:00 AST",
  };
}

export const tadawulProvider: MarketDataProvider = {
  id: "tadawul",
  name: "Tadawul / Saudi Market",
  assetClasses: ["saudi"],
  isConfigured: () => isSaudiMarketConfigured(),
  async searchSymbols(query, limit = 10) {
    return searchCatalog(query, limit).filter((s) => s.assetClass === "saudi");
  },
  async getQuote(symbol) {
    const { quote } = await getSaudiMarketQuote(symbol);
    if (quote) return quote;
    return yahooProvider.getQuote(symbol);
  },
  async getCandles(symbol, timeframe, limit) {
    return yahooProvider.getCandles(symbol, timeframe, limit);
  },
  async getMarketStatus() {
    return tadawulSessionStatus();
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

export { getSaudiMarketMode };
