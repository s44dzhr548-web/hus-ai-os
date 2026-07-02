import type { MarketDataProvider } from "../types";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";

export const polygonProvider: MarketDataProvider = {
  id: "polygon",
  name: "Polygon.io",
  assetClasses: ["stock", "etf", "index", "crypto", "forex"],
  isConfigured: () => hasKey("POLYGON_API_KEY"),
  async searchSymbols() {
    return [];
  },
  async getQuote(symbol) {
    const key = envKey("POLYGON_API_KEY");
    if (!key) return null;
    const data = await fetchJson<{ results?: { c: number; o: number; h: number; l: number; v: number }[] }>(
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${key}`
    );
    const bar = data?.results?.[0];
    if (!bar?.c) return null;
    const meta = getCatalogEntry(symbol);
    const changePct = bar.o ? ((bar.c - bar.o) / bar.o) * 100 : 0;
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: meta?.assetClass ?? "stock",
        exchange: meta?.exchange ?? "US",
        currency: "USD",
        price: bar.c,
        changePct: Number(changePct.toFixed(2)),
        volume: bar.v ?? 0,
        high24h: bar.h,
        low24h: bar.l,
      },
      "polygon",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const key = envKey("POLYGON_API_KEY");
    if (!key) return null;
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - limit * 86400000).toISOString().slice(0, 10);
    const mult = timeframe === "1Day" ? "1" : "1";
    const span = timeframe === "1Day" ? "day" : "hour";
    const data = await fetchJson<{ results?: { t: number; o: number; h: number; l: number; c: number; v: number }[] }>(
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${span}/${fromDate}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${key}`
    );
    if (!data?.results?.length) return null;
    return data.results.map((bar) => ({
      symbol,
      timeframe,
      bar_time: new Date(bar.t).toISOString(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      source: "polygon" as const,
      isDemoData: false,
    }));
  },
  async getMarketStatus(exchange) {
    return mockProvider.getMarketStatus(exchange);
  },
};
