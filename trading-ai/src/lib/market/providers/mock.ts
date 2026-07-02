import type { MarketDataProvider, MarketStatusInfo, NormalizedCandle, NormalizedQuote, SymbolSearchResult } from "../types";
import { generateMockBars, getMockAsset } from "@/lib/data/mock-market";
import { searchCatalog } from "../catalog";
import { EXCHANGE_TIMEZONES } from "../config";

function sessionForExchange(exchange: string): MarketStatusInfo {
  const tz = EXCHANGE_TIMEZONES[exchange] ?? "UTC";
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const hour = local.getHours();
  const day = local.getDay();
  const isWeekend = day === 0 || day === 6;
  let session: MarketStatusInfo["session"] = "unknown";
  let isOpen = false;

  if (exchange === "Crypto" || exchange === "FX") {
    session = "open";
    isOpen = true;
  } else if (exchange === "Tadawul") {
    isOpen = !isWeekend && hour >= 10 && hour < 15;
    session = isOpen ? "open" : "closed";
  } else if (["NASDAQ", "NYSE", "COMEX", "CME"].includes(exchange)) {
    if (isWeekend) session = "closed";
    else if (hour >= 9 && hour < 16) {
      session = "open";
      isOpen = true;
    } else if (hour >= 4 && hour < 9) session = "pre_market";
    else if (hour >= 16 && hour < 20) session = "after_hours";
    else session = "closed";
  }

  return {
    exchange,
    timezone: tz,
    session,
    isOpen,
    localTime: local.toISOString(),
  };
}

export const mockProvider: MarketDataProvider = {
  id: "mock",
  name: "Mock Market Data",
  assetClasses: ["stock", "crypto", "forex", "saudi", "commodity", "index", "etf"],
  isConfigured: () => true,
  searchSymbols(query, limit = 20) {
    return Promise.resolve(searchCatalog(query, limit));
  },
  async getQuote(symbol) {
    const asset = getMockAsset(symbol);
    return {
      ...asset,
      source: "mock",
      isDemoData: true,
      timestamp: new Date().toISOString(),
    };
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    return generateMockBars(symbol, limit).map((b) => ({
      ...b,
      timeframe,
      source: "mock" as const,
      isDemoData: true,
    }));
  },
  async getMarketStatus(exchange) {
    return sessionForExchange(exchange);
  },
};

export function wrapQuote(
  quote: Omit<NormalizedQuote, "source" | "isDemoData" | "timestamp">,
  source: NormalizedQuote["source"],
  isDemoData: boolean
): NormalizedQuote {
  return { ...quote, source, isDemoData, timestamp: new Date().toISOString() };
}

export function barsToCandles(
  bars: ReturnType<typeof generateMockBars>,
  source: NormalizedCandle["source"],
  isDemoData: boolean
): NormalizedCandle[] {
  return bars.map((b) => ({ ...b, source, isDemoData }));
}

export function filterSearch(results: SymbolSearchResult[], query: string, limit: number): SymbolSearchResult[] {
  return searchCatalog(query, limit).filter((r) =>
    results.length ? results.some((x) => x.symbol === r.symbol) || true : true
  );
}
