import type { MarketDataProvider } from "../types";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";

export const alphaVantageProvider: MarketDataProvider = {
  id: "alpha_vantage",
  name: "Alpha Vantage",
  assetClasses: ["stock", "etf", "forex", "commodity"],
  isConfigured: () => hasKey("ALPHA_VANTAGE_API_KEY"),
  async searchSymbols() {
    return [];
  },
  async getQuote(symbol) {
    const key = envKey("ALPHA_VANTAGE_API_KEY");
    if (!key) return null;
    const meta = getCatalogEntry(symbol);
    const isForex = meta?.assetClass === "forex";
    const url = isForex
      ? `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol.slice(0, 3)}&to_currency=${symbol.slice(3, 6)}&apikey=${key}`
      : `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const data = await fetchJson<Record<string, unknown>>(url);
    if (isForex) {
      const rate = (data?.["Realtime Currency Exchange Rate"] as Record<string, string>)?.["5. Exchange Rate"];
      if (!rate) return null;
      const price = Number(rate);
      return wrapQuote(
        {
          symbol,
          name: meta?.name ?? symbol,
          assetClass: "forex",
          exchange: "FX",
          currency: "USD",
          price,
          changePct: 0,
          volume: 0,
        },
        "alpha_vantage",
        false
      );
    }
    const quote = data?.["Global Quote"] as Record<string, string>;
    if (!quote?.["05. price"]) return null;
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: meta?.assetClass ?? "stock",
        exchange: meta?.exchange ?? "US",
        currency: "USD",
        price: Number(quote["05. price"]),
        changePct: Number(quote["10. change percent"]?.replace("%", "") ?? 0),
        volume: Number(quote["06. volume"] ?? 0),
      },
      "alpha_vantage",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const key = envKey("ALPHA_VANTAGE_API_KEY");
    if (!key) return null;
    const data = await fetchJson<{ "Time Series (Daily)": Record<string, { "1. open": string; "2. high": string; "3. low": string; "4. close": string; "5. volume": string }> }>(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${key}`
    );
    const series = data?.["Time Series (Daily)"];
    if (!series) return null;
    return Object.entries(series)
      .slice(0, limit)
      .map(([date, row]) => ({
        symbol,
        timeframe,
        bar_time: new Date(date).toISOString(),
        open: Number(row["1. open"]),
        high: Number(row["2. high"]),
        low: Number(row["3. low"]),
        close: Number(row["4. close"]),
        volume: Number(row["5. volume"]),
        source: "alpha_vantage" as const,
        isDemoData: false,
      }))
      .reverse();
  },
  async getMarketStatus(exchange) {
    return mockProvider.getMarketStatus(exchange);
  },
};
