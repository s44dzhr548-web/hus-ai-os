import type { MarketDataProvider } from "../types";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getCatalogEntry, searchCatalog } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";

export const forexProvider: MarketDataProvider = {
  id: "forex",
  name: "Forex Provider",
  assetClasses: ["forex"],
  isConfigured: () => hasKey("FOREX_PROVIDER_KEY"),
  async searchSymbols(query, limit = 10) {
    return searchCatalog(query, limit).filter((s) => s.assetClass === "forex");
  },
  async getQuote(symbol) {
    const key = envKey("FOREX_PROVIDER_KEY");
    if (!key) return null;
    const data = await fetchJson<{ quotes?: { close: number; percent_change: number }[] }>(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${key}`
    );
    const row = data?.quotes?.[0];
    if (!row?.close) {
      const av = await fetchJson<Record<string, Record<string, string>>>(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol.slice(0, 3)}&to_currency=${symbol.slice(3, 6)}&apikey=${key}`
      );
      const rate = av?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
      if (!rate) return null;
      const meta = getCatalogEntry(symbol);
      return wrapQuote(
        {
          symbol,
          name: meta?.name ?? symbol,
          assetClass: "forex",
          exchange: "FX",
          currency: "USD",
          price: Number(rate),
          changePct: 0,
          volume: 0,
        },
        "forex",
        false
      );
    }
    const meta = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: "forex",
        exchange: "FX",
        currency: "USD",
        price: row.close,
        changePct: row.percent_change ?? 0,
        volume: 0,
      },
      "forex",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const key = envKey("FOREX_PROVIDER_KEY");
    if (!key) return null;
    const data = await fetchJson<{ values: { datetime: string; open: string; high: string; low: string; close: string }[] }>(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${limit}&apikey=${key}`
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
        volume: 0,
        source: "forex" as const,
        isDemoData: false,
      }))
      .reverse();
  },
  async getMarketStatus() {
    return mockProvider.getMarketStatus("FX");
  },
};
