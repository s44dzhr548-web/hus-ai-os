import type { MarketDataProvider } from "../types";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getCatalogEntry, searchCatalog } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";

export const finnhubProvider: MarketDataProvider = {
  id: "finnhub",
  name: "Finnhub",
  assetClasses: ["stock", "etf", "index"],
  isConfigured: () => hasKey("FINNHUB_API_KEY"),
  async searchSymbols(query, limit = 15) {
    const key = envKey("FINNHUB_API_KEY");
    if (!key) return searchCatalog(query, limit).filter((s) => ["stock", "etf", "index"].includes(s.assetClass));
    const data = await fetchJson<{ result: { symbol: string; description: string; type: string }[] }>(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${key}`
    );
    return (data?.result ?? []).slice(0, limit).map((r) => ({
      symbol: r.symbol,
      name: r.description,
      assetClass: r.type?.includes("ETF") ? ("etf" as const) : ("stock" as const),
      exchange: "US",
      currency: "USD",
    }));
  },
  async getQuote(symbol) {
    const key = envKey("FINNHUB_API_KEY");
    if (!key) return null;
    const data = await fetchJson<{ c: number; d: number; dp: number; h: number; l: number; v: number }>(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`
    );
    if (!data?.c) return null;
    const meta = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: meta?.assetClass ?? "stock",
        exchange: meta?.exchange ?? "NASDAQ",
        currency: "USD",
        price: data.c,
        changePct: Number((data.dp ?? 0).toFixed(2)),
        volume: data.v ?? 0,
        high24h: data.h,
        low24h: data.l,
      },
      "finnhub",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const key = envKey("FINNHUB_API_KEY");
    if (!key) return null;
    const now = Math.floor(Date.now() / 1000);
    const from = now - limit * 86400;
    const resolution = timeframe === "1Day" ? "D" : "60";
    const data = await fetchJson<{ s: string; o: number[]; h: number[]; l: number[]; c: number[]; v: number[]; t: number[] }>(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${key}`
    );
    if (data?.s !== "ok" || !data.t?.length) return null;
    return data.t.map((ts, i) => ({
      symbol,
      timeframe,
      bar_time: new Date(ts * 1000).toISOString(),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
      source: "finnhub" as const,
      isDemoData: false,
    }));
  },
  async getMarketStatus(exchange) {
    return mockProvider.getMarketStatus(exchange);
  },
};
