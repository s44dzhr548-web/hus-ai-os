import type { MarketDataProvider } from "../types";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";

export const twelveDataProvider: MarketDataProvider = {
  id: "twelve_data",
  name: "Twelve Data",
  assetClasses: ["stock", "etf", "forex", "crypto", "commodity", "index"],
  isConfigured: () => hasKey("TWELVE_DATA_API_KEY"),
  async searchSymbols(query, limit = 15) {
    const key = envKey("TWELVE_DATA_API_KEY");
    if (!key) return [];
    const data = await fetchJson<{ data: { symbol: string; instrument_name: string; exchange: string; currency: string }[] }>(
      `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${key}`
    );
    return (data?.data ?? []).slice(0, limit).map((r) => ({
      symbol: r.symbol,
      name: r.instrument_name,
      assetClass: "stock" as const,
      exchange: r.exchange,
      currency: r.currency,
    }));
  },
  async getQuote(symbol) {
    const key = envKey("TWELVE_DATA_API_KEY");
    if (!key) return null;
    const data = await fetchJson<{ symbol: string; close: string; percent_change: string; volume: string }>(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${key}`
    );
    if (!data?.close) return null;
    const meta = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: meta?.assetClass ?? "stock",
        exchange: meta?.exchange ?? "US",
        currency: meta?.currency ?? "USD",
        price: Number(data.close),
        changePct: Number(data.percent_change ?? 0),
        volume: Number(data.volume ?? 0),
      },
      "twelve_data",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const key = envKey("TWELVE_DATA_API_KEY");
    if (!key) return null;
    const interval = timeframe === "1Day" ? "1day" : "1h";
    const data = await fetchJson<{ values: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[] }>(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${limit}&apikey=${key}`
    );
    if (!data?.values?.length) return null;
    return data.values
      .map((row) => ({
        symbol,
        timeframe,
        bar_time: new Date(row.datetime).toISOString(),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume ?? 0),
        source: "twelve_data" as const,
        isDemoData: false,
      }))
      .reverse();
  },
  async getMarketStatus(exchange) {
    return mockProvider.getMarketStatus(exchange);
  },
};
