import type { MarketDataProvider } from "../types";
import { fetchJson } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { parseForexPair } from "../symbols";
import { mockProvider, wrapQuote } from "./mock";

type FrankfurterLatest = { rates: Record<string, number> };
type FrankfurterHistory = { rates: Record<string, Record<string, number>> };

export const frankfurterProvider: MarketDataProvider = {
  id: "frankfurter",
  name: "Frankfurter (ECB rates)",
  assetClasses: ["forex"],
  isConfigured: () => true,
  async searchSymbols() {
    return [];
  },
  async getQuote(symbol) {
    const pair = parseForexPair(symbol);
    if (!pair) return null;
    const data = await fetchJson<FrankfurterLatest>(
      `https://api.frankfurter.app/latest?from=${pair.from}&to=${pair.to}`,
      { cacheKey: `fx-${symbol}`, cacheTtlMs: 120_000, rateLimitProvider: "frankfurter" }
    );
    const rate = data?.rates?.[pair.to];
    if (!rate) return null;
    const meta = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: "forex",
        exchange: "FX",
        currency: pair.to,
        price: rate,
        changePct: 0,
        volume: 0,
      },
      "frankfurter",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const pair = parseForexPair(symbol);
    if (!pair) return null;
    const end = new Date();
    const start = new Date(Date.now() - limit * 86400000);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);
    const data = await fetchJson<FrankfurterHistory>(
      `https://api.frankfurter.app/${from}..${to}?from=${pair.from}&to=${pair.to}`,
      { cacheKey: `fx-candles-${symbol}-${limit}`, cacheTtlMs: 300_000, rateLimitProvider: "frankfurter" }
    );
    if (!data?.rates) return null;
    const dates = Object.keys(data.rates).sort();
    let prev = 0;
    return dates.map((date) => {
      const rate = data.rates[date][pair.to];
      const open = prev || rate;
      prev = rate;
      return {
        symbol,
        timeframe,
        bar_time: new Date(date).toISOString(),
        open,
        high: Math.max(open, rate),
        low: Math.min(open, rate),
        close: rate,
        volume: 0,
        source: "frankfurter" as const,
        isDemoData: false,
      };
    });
  },
  async getMarketStatus() {
    return mockProvider.getMarketStatus("FX");
  },
};
