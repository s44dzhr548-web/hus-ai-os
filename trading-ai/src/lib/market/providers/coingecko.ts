import type { MarketDataProvider, NormalizedCandle, NormalizedQuote } from "../types";
import { envKey } from "../config";
import { fetchJson } from "../fetch";
import { COINGECKO_IDS, getCatalogEntry } from "../catalog";
import { wrapQuote } from "./mock";

type CoinGeckoPrice = Record<string, { usd: number; usd_24h_change?: number }>;

export const coingeckoProvider: MarketDataProvider = {
  id: "coingecko",
  name: "CoinGecko",
  assetClasses: ["crypto"],
  isConfigured: () => true,
  async searchSymbols(query, limit = 10) {
    const data = await fetchJson<{ coins: { symbol: string; name: string }[] }>(
      `https://api.coingecko.com/api/v3/search/query?query=${encodeURIComponent(query)}`
    );
    if (!data?.coins?.length) return [];
    return data.coins.slice(0, limit).map((c) => ({
      symbol: c.symbol.toUpperCase() + "USD",
      name: c.name,
      assetClass: "crypto" as const,
      exchange: "Crypto",
      currency: "USD",
    }));
  },
  async getQuote(symbol) {
    const id = COINGECKO_IDS[symbol];
    if (!id) return null;
    const data = await fetchJson<CoinGeckoPrice>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`
    );
    const row = data?.[id];
    if (!row?.usd) return null;
    const meta = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: "crypto",
        exchange: "Crypto",
        currency: "USD",
        price: row.usd,
        changePct: Number((row.usd_24h_change ?? 0).toFixed(2)),
        volume: 0,
      },
      "coingecko",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const id = COINGECKO_IDS[symbol];
    if (!id) return null;
    const days = Math.min(limit, 90);
    const data = await fetchJson<{ prices: [number, number][]; total_volumes: [number, number][] }>(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    );
    if (!data?.prices?.length) return null;
    const candles: NormalizedCandle[] = data.prices.map(([ts, price], i) => {
      const prev = data.prices[i - 1]?.[1] ?? price;
      return {
        symbol,
        timeframe,
        bar_time: new Date(ts).toISOString(),
        open: prev,
        high: Math.max(prev, price),
        low: Math.min(prev, price),
        close: price,
        volume: data.total_volumes[i]?.[1] ?? 0,
        source: "coingecko",
        isDemoData: false,
      };
    });
    return candles.slice(-limit);
  },
  async getMarketStatus() {
    return { exchange: "Crypto", timezone: "UTC", session: "open", isOpen: true, localTime: new Date().toISOString() };
  },
};
