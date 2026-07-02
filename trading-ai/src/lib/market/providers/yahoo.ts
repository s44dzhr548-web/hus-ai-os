import type { MarketDataProvider } from "../types";
import { fetchJson, safeFetch } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { resolveYahooTicker } from "../symbols";
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

function yahooChartUrl(ticker: string, range: string, interval = "1d") {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
}

export const yahooProvider: MarketDataProvider = {
  id: "yahoo",
  name: "Yahoo Finance",
  assetClasses: ["stock", "etf", "index", "commodity", "crypto", "forex", "saudi"],
  isConfigured: () => true,
  async searchSymbols() {
    return [];
  },
  async getQuote(symbol) {
    const yahooSymbol = resolveYahooTicker(symbol);
    const data = await fetchJson<YahooChart>(yahooChartUrl(yahooSymbol, "1d"), {
      cacheKey: `yahoo-q-${symbol}`,
      cacheTtlMs: 60_000,
      rateLimitProvider: "yahoo",
    });
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
    const yahooSymbol = resolveYahooTicker(symbol);
    const range = limit <= 30 ? "1mo" : limit <= 90 ? "3mo" : "6mo";
    const interval = timeframe === "1Day" ? "1d" : "1h";
    const data = await fetchJson<YahooChart>(yahooChartUrl(yahooSymbol, range, interval), {
      cacheKey: `yahoo-c-${symbol}-${limit}`,
      cacheTtlMs: 120_000,
      rateLimitProvider: "yahoo",
    });
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

export async function fetchYahooNewsHeadlines(symbol: string): Promise<{ title: string; publishedAt: string }[]> {
  const ticker = resolveYahooTicker(symbol);
  const res = await safeFetch(
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`,
    { timeoutMs: 10000, rateLimitProvider: "yahoo" }
  );
  if (!res) return [];
  const xml = await res.text();
  const items: { title: string; publishedAt: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? block.match(/<title>(.*?)<\/title>/)?.[1];
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    if (title) items.push({ title, publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() });
  }
  return items.slice(0, 8);
}
