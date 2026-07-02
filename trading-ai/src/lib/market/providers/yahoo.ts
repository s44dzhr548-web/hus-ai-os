import type { MarketDataProvider } from "../types";
import { fetchJson } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { mockProvider, wrapQuote } from "./mock";

type YahooChart = {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number; previousClose?: number; symbol?: string };
      timestamp?: number[];
      indicators?: { quote?: { open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }[] };
    }[];
  };
};

export const yahooProvider: MarketDataProvider = {
  id: "yahoo",
  name: "Yahoo Finance",
  assetClasses: ["stock", "etf", "index", "commodity", "crypto", "forex"],
  isConfigured: () => true,
  async searchSymbols() {
    return [];
  },
  async getQuote(symbol) {
    const yahooSymbol = symbol === "2222" ? "2222.SR" : symbol === "1120" ? "1120.SR" : symbol === "2010" ? "2010.SR" : symbol;
    const data = await fetchJson<YahooChart>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`
    );
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const prev = meta.previousClose ?? meta.regularMarketPrice;
    const changePct = prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    const catalog = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: catalog?.name ?? symbol,
        assetClass: catalog?.assetClass ?? "stock",
        exchange: catalog?.exchange ?? "US",
        currency: catalog?.currency ?? "USD",
        price: meta.regularMarketPrice,
        changePct: Number(changePct.toFixed(2)),
        volume: 0,
      },
      "yahoo",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const yahooSymbol = symbol === "2222" ? "2222.SR" : symbol === "1120" ? "1120.SR" : symbol === "2010" ? "2010.SR" : symbol;
    const range = limit <= 30 ? "1mo" : "3mo";
    const data = await fetchJson<YahooChart>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${range}`
    );
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!result?.timestamp?.length || !quote?.close) return null;
    return result.timestamp
      .map((ts, i) => {
        const close = quote.close?.[i];
        if (close == null) return null;
        return {
          symbol,
          timeframe,
          bar_time: new Date(ts * 1000).toISOString(),
          open: quote.open?.[i] ?? close,
          high: quote.high?.[i] ?? close,
          low: quote.low?.[i] ?? close,
          close,
          volume: quote.volume?.[i] ?? 0,
          source: "yahoo" as const,
          isDemoData: false,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null)
      .slice(-limit);
  },
  async getMarketStatus(exchange) {
    return mockProvider.getMarketStatus(exchange);
  },
};
