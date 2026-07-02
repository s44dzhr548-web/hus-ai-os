import type { MarketDataProvider, NormalizedCandle, NormalizedQuote } from "../types";
import { fetchJson } from "../fetch";
import { BINANCE_SYMBOLS, getCatalogEntry } from "../catalog";
import { wrapQuote } from "./mock";

type BinanceTicker = { symbol: string; lastPrice: string; priceChangePercent: string; volume: string };
type BinanceKline = [number, string, string, string, string, string];

export const binanceProvider: MarketDataProvider = {
  id: "binance",
  name: "Binance Public",
  assetClasses: ["crypto"],
  isConfigured: () => true,
  async searchSymbols() {
    return [];
  },
  async getQuote(symbol) {
    const pair = BINANCE_SYMBOLS[symbol];
    if (!pair) return null;
    const data = await fetchJson<BinanceTicker>(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`
    );
    if (!data?.lastPrice) return null;
    const meta = getCatalogEntry(symbol);
    return wrapQuote(
      {
        symbol,
        name: meta?.name ?? symbol,
        assetClass: "crypto",
        exchange: "Crypto",
        currency: "USD",
        price: Number(data.lastPrice),
        changePct: Number(data.priceChangePercent),
        volume: Number(data.volume),
      },
      "binance",
      false
    );
  },
  async getCandles(symbol, timeframe = "1Day", limit = 90) {
    const pair = BINANCE_SYMBOLS[symbol];
    if (!pair) return null;
    const interval = timeframe === "1Day" ? "1d" : "1h";
    const data = await fetchJson<BinanceKline[]>(
      `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${Math.min(limit, 500)}`
    );
    if (!data?.length) return null;
    return data.map((k) => ({
      symbol,
      timeframe,
      bar_time: new Date(k[0]).toISOString(),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
      source: "binance" as const,
      isDemoData: false,
    }));
  },
  async getMarketStatus() {
    return { exchange: "Crypto", timezone: "UTC", session: "open", isOpen: true, localTime: new Date().toISOString() };
  },
};
