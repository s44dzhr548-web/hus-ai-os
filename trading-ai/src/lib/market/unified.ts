import type { AssetClass } from "@/types/trading";
import type {
  MarketDataProvider,
  MarketDataResult,
  MarketStatusInfo,
  NormalizedCandle,
  NormalizedQuote,
  ProviderHealth,
  SymbolSearchResult,
} from "./types";
import { assetClassForSymbol, getCatalogEntry, searchCatalog } from "./catalog";
import {
  getMissingApiKeys,
  hasKey,
  isRealMarketDataMode,
  PROVIDER_LABELS,
  PUBLIC_LIVE_PROVIDERS,
} from "./config";
import { mockProvider } from "./providers/mock";
import { coingeckoProvider } from "./providers/coingecko";
import { binanceProvider } from "./providers/binance";
import { finnhubProvider } from "./providers/finnhub";
import { alphaVantageProvider } from "./providers/alpha-vantage";
import { twelveDataProvider } from "./providers/twelve-data";
import { polygonProvider } from "./providers/polygon";
import { yahooProvider } from "./providers/yahoo";
import { forexProvider } from "./providers/forex";
import { frankfurterProvider } from "./providers/frankfurter";
import { tadawulProvider } from "./providers/tadawul";
import { fetchEconomicCalendar, fetchNews, isEconomicCalendarConfigured, isNewsConfigured } from "./providers/news";

const LIVE_PROVIDERS: MarketDataProvider[] = [
  coingeckoProvider,
  binanceProvider,
  yahooProvider,
  frankfurterProvider,
  finnhubProvider,
  polygonProvider,
  twelveDataProvider,
  alphaVantageProvider,
  forexProvider,
  tadawulProvider,
];

function providersForAsset(assetClass: AssetClass): MarketDataProvider[] {
  switch (assetClass) {
    case "crypto":
      return [coingeckoProvider, binanceProvider, yahooProvider];
    case "forex":
      return [frankfurterProvider, forexProvider, yahooProvider, alphaVantageProvider];
    case "saudi":
      return [yahooProvider, tadawulProvider];
    case "commodity":
      return [yahooProvider, polygonProvider, alphaVantageProvider];
    case "etf":
    case "index":
      return [yahooProvider, finnhubProvider, polygonProvider, twelveDataProvider, alphaVantageProvider];
    case "stock":
      return [yahooProvider, finnhubProvider, polygonProvider, twelveDataProvider, alphaVantageProvider];
    default:
      return [yahooProvider, finnhubProvider];
  }
}

function isProviderAvailable(provider: MarketDataProvider): boolean {
  if (provider.id === "mock") return true;
  if (PUBLIC_LIVE_PROVIDERS.includes(provider.id)) return true;
  return provider.isConfigured();
}

async function tryProviders<T>(
  providers: MarketDataProvider[],
  fn: (p: MarketDataProvider) => Promise<T | null>
): Promise<MarketDataResult<T> | null> {
  let lastReason = "No live provider available";
  for (const provider of providers) {
    if (!isProviderAvailable(provider)) continue;
    try {
      const data = await fn(provider);
      if (data) {
        const isDemo =
          provider.id === "mock" ||
          (Array.isArray(data)
            ? (data[0] as { isDemoData?: boolean })?.isDemoData === true
            : (data as { isDemoData?: boolean }).isDemoData === true);
        return {
          data,
          source: provider.id,
          isDemoData: isDemo,
          fallbackReason: isDemo ? lastReason : undefined,
        };
      }
    } catch {
      lastReason = `${provider.name} failed`;
    }
  }
  return null;
}

async function demoFallback<T>(fn: () => Promise<T | null>, reason: string): Promise<MarketDataResult<T>> {
  const data = await fn();
  return { data: data!, source: "mock", isDemoData: true, fallbackReason: reason };
}

export async function unifiedSearch(query: string, limit = 20): Promise<SymbolSearchResult[]> {
  const local = searchCatalog(query, limit);
  const remoteSets = await Promise.all(
    [finnhubProvider, twelveDataProvider, coingeckoProvider].map((p) =>
      isProviderAvailable(p) ? p.searchSymbols(query, limit) : Promise.resolve([])
    )
  );
  const merged = new Map<string, SymbolSearchResult>();
  for (const r of [...remoteSets.flat(), ...local]) merged.set(r.symbol, r);
  return [...merged.values()].slice(0, limit);
}

export async function unifiedQuote(symbol: string): Promise<MarketDataResult<NormalizedQuote>> {
  if (!isRealMarketDataMode()) {
    const mock = await mockProvider.getQuote(symbol);
    return { data: mock!, source: "mock", isDemoData: true, fallbackReason: "MARKET_DATA_MODE=demo" };
  }

  const assetClass = assetClassForSymbol(symbol);
  const result = await tryProviders(providersForAsset(assetClass), (p) => p.getQuote(symbol));
  if (result && !result.isDemoData) return result as MarketDataResult<NormalizedQuote>;

  const mock = await mockProvider.getQuote(symbol);
  return demoFallback(() => Promise.resolve(mock), result?.fallbackReason ?? "All live providers failed");
}

export async function unifiedCandles(
  symbol: string,
  timeframe = "1Day",
  limit = 90
): Promise<MarketDataResult<NormalizedCandle[]>> {
  if (!isRealMarketDataMode()) {
    const mock = await mockProvider.getCandles(symbol, timeframe, limit);
    return { data: mock!, source: "mock", isDemoData: true, fallbackReason: "MARKET_DATA_MODE=demo" };
  }

  const assetClass = assetClassForSymbol(symbol);
  const result = await tryProviders(providersForAsset(assetClass), (p) => p.getCandles(symbol, timeframe, limit));
  if (result && !result.isDemoData) return result as MarketDataResult<NormalizedCandle[]>;

  const mock = await mockProvider.getCandles(symbol, timeframe, limit);
  return demoFallback(() => Promise.resolve(mock), result?.fallbackReason ?? "All live providers failed");
}

export async function unifiedMarketStatus(exchange: string): Promise<MarketStatusInfo> {
  const status = await mockProvider.getMarketStatus(exchange);
  return status ?? { exchange, timezone: "UTC", session: "unknown", isOpen: false, localTime: new Date().toISOString() };
}

export async function unifiedOverview(symbols: string[]) {
  const quotes = await Promise.all(symbols.map((s) => unifiedQuote(s)));
  const assets = quotes.map((q) => q.data);
  const liveCount = quotes.filter((q) => !q.isDemoData).length;
  const demoCount = quotes.length - liveCount;
  const mode = liveCount === 0 ? "mock" : demoCount === 0 ? "live" : "mixed";
  const sorted = [...assets].sort((a, b) => b.changePct - a.changePct);
  return {
    mode: mode as "mock" | "live" | "mixed",
    assets,
    indices: assets.filter((a) => ["SPY", "BTCUSD", "EURUSD", "SPX", "TASI", "QQQ"].includes(a.symbol)),
    topGainers: sorted.slice(0, 3),
    topLosers: sorted.slice(-3).reverse(),
    updatedAt: new Date().toISOString(),
    demoCount,
    liveCount,
    realMarketDataMode: isRealMarketDataMode(),
    quotesMeta: quotes.map((q) => ({ symbol: q.data.symbol, source: q.source, isDemoData: q.isDemoData })),
  };
}

export function getProviderHealth(): ProviderHealth[] {
  return [
    { id: "yahoo", name: PROVIDER_LABELS.yahoo, assetClasses: ["stock", "etf", "index", "commodity", "forex", "saudi", "crypto"], status: "live", hasApiKey: true, description: "Live Yahoo Finance — no key required" },
    { id: "coingecko", name: PROVIDER_LABELS.coingecko, assetClasses: ["crypto"], status: "live", hasApiKey: true, description: "Live public crypto prices" },
    { id: "binance", name: PROVIDER_LABELS.binance, assetClasses: ["crypto"], status: "live", hasApiKey: true, description: "Live Binance public market data" },
    { id: "frankfurter", name: PROVIDER_LABELS.frankfurter, assetClasses: ["forex"], status: "live", hasApiKey: true, description: "Live ECB forex rates — no key required" },
    { id: "finnhub", name: PROVIDER_LABELS.finnhub, assetClasses: ["stock", "etf"], status: hasKey("FINNHUB_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("FINNHUB_API_KEY"), description: "FINNHUB_API_KEY → auto-enables live US data" },
    { id: "polygon", name: PROVIDER_LABELS.polygon, assetClasses: ["stock", "etf", "crypto"], status: hasKey("POLYGON_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("POLYGON_API_KEY"), description: "POLYGON_API_KEY" },
    { id: "alpha_vantage", name: PROVIDER_LABELS.alpha_vantage, assetClasses: ["stock", "forex", "commodity"], status: hasKey("ALPHA_VANTAGE_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("ALPHA_VANTAGE_API_KEY"), description: "ALPHA_VANTAGE_API_KEY" },
    { id: "twelve_data", name: PROVIDER_LABELS.twelve_data, assetClasses: ["stock", "forex", "crypto"], status: hasKey("TWELVE_DATA_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("TWELVE_DATA_API_KEY"), description: "TWELVE_DATA_API_KEY" },
    { id: "forex", name: PROVIDER_LABELS.forex, assetClasses: ["forex"], status: hasKey("FOREX_PROVIDER_KEY") ? "live" : "requires_key", hasApiKey: hasKey("FOREX_PROVIDER_KEY"), description: "FOREX_PROVIDER_KEY" },
    { id: "tadawul", name: PROVIDER_LABELS.tadawul, assetClasses: ["saudi"], status: hasKey("TADAWUL_PROVIDER_KEY") ? "live" : "live", hasApiKey: hasKey("TADAWUL_PROVIDER_KEY"), description: "Live via Yahoo .SR · TADAWUL_PROVIDER_KEY optional" },
    { id: "news", name: PROVIDER_LABELS.news, assetClasses: ["stock", "crypto", "forex", "saudi"], status: isNewsConfigured() ? "live" : "live", hasApiKey: isNewsConfigured(), description: "Live Yahoo RSS · NEWS_API_KEY optional upgrade" },
    { id: "economic_calendar", name: PROVIDER_LABELS.economic_calendar, assetClasses: ["stock", "forex"], status: isEconomicCalendarConfigured() ? "live" : "live", hasApiKey: isEconomicCalendarConfigured(), description: "Live FairEconomy · ECONOMIC_CALENDAR_API_KEY optional" },
    { id: "mock", name: PROVIDER_LABELS.mock, assetClasses: ["stock", "crypto", "forex", "saudi", "commodity", "index", "etf"], status: "mock", hasApiKey: true, description: "Demo fallback only when live providers fail" },
  ];
}

export function resolveExchange(symbol: string): string {
  return getCatalogEntry(symbol)?.exchange ?? "US";
}

export { LIVE_PROVIDERS as ALL_PROVIDERS, getMissingApiKeys, isRealMarketDataMode };
