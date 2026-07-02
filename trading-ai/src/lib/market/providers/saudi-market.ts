import type { NormalizedQuote } from "../types";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getCatalogEntry } from "../catalog";
import { resolveYahooTicker } from "../symbols";
import { wrapQuote } from "./mock";

/** Licensed Tadawul data partner base URL — override via SAUDI_MARKET_API_URL */
const DEFAULT_SAUDI_API_BASE = "https://api.tadawul.com.sa/data/v1";

export type SaudiDataSource = "licensed" | "yahoo_sr" | "unavailable";

function saudiApiBase(): string {
  return process.env.SAUDI_MARKET_API_URL?.trim() || DEFAULT_SAUDI_API_BASE;
}

async function fetchLicensedSaudiQuote(symbol: string, apiKey: string): Promise<NormalizedQuote | null> {
  const data = await fetchJson<{
    symbol?: string;
    lastPrice?: number;
    changePercent?: number;
    volume?: number;
    price?: number;
  }>(
    `${saudiApiBase()}/quotes/${encodeURIComponent(symbol)}?apikey=${encodeURIComponent(apiKey)}`,
    { rateLimitProvider: "tadawul", cacheKey: `saudi-licensed-${symbol}`, cacheTtlMs: 30_000, timeoutMs: 6000 }
  );
  const price = data?.lastPrice ?? data?.price;
  if (!data || !price) return null;
  const meta = getCatalogEntry(symbol);
  return wrapQuote(
    {
      symbol,
      name: meta?.name ?? symbol,
      assetClass: "saudi",
      exchange: "Tadawul",
      currency: "SAR",
      price,
      changePct: Number(data.changePercent ?? 0),
      volume: data.volume ?? 0,
    },
    "tadawul",
    false
  );
}

async function fetchYahooSaudiQuote(symbol: string): Promise<NormalizedQuote | null> {
  const ticker = resolveYahooTicker(symbol);
  const data = await fetchJson<{
    chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number }; indicators?: { quote?: { volume?: number[] }[] } }[] };
  }>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
    {
      rateLimitProvider: "yahoo",
      cacheKey: `saudi-yahoo-${symbol}`,
      cacheTtlMs: 60_000,
      timeoutMs: 8000,
      headers: { "User-Agent": "TradingAI/1.0" },
    }
  );
  const result = data?.chart?.result?.[0];
  if (!result?.meta?.regularMarketPrice) return null;
  const price = result.meta.regularMarketPrice;
  const prev = result.meta.chartPreviousClose ?? price;
  const changePct = prev ? ((price - prev) / prev) * 100 : 0;
  const vol = result.indicators?.quote?.[0]?.volume?.slice(-1)[0] ?? 0;
  const meta = getCatalogEntry(symbol);
  return wrapQuote(
    {
      symbol,
      name: meta?.name ?? symbol,
      assetClass: "saudi",
      exchange: "Tadawul",
      currency: "SAR",
      price,
      changePct: Number(changePct.toFixed(2)),
      volume: vol,
    },
    "tadawul",
    false
  );
}

/** Professional Saudi market adapter: licensed API → Yahoo .SR → unavailable */
export async function getSaudiMarketQuote(symbol: string): Promise<{ quote: NormalizedQuote | null; source: SaudiDataSource }> {
  const licensedKey = envKey("TADAWUL_PROVIDER_KEY");
  if (licensedKey) {
    try {
      const licensed = await fetchLicensedSaudiQuote(symbol, licensedKey);
      if (licensed) return { quote: licensed, source: "licensed" };
    } catch {
      /* fall through to Yahoo */
    }
  }
  const yahoo = await fetchYahooSaudiQuote(symbol);
  if (yahoo) return { quote: yahoo, source: "yahoo_sr" };
  return { quote: null, source: "unavailable" };
}

export function getSaudiMarketMode(): "licensed" | "yahoo_fallback" | "unconfigured" {
  if (hasKey("TADAWUL_PROVIDER_KEY")) return "licensed";
  return "yahoo_fallback";
}

export function isSaudiMarketConfigured(): boolean {
  return true;
}
