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
import { hasKey, isAnyLiveKeyPresent, PROVIDER_LABELS } from "./config";
import { mockProvider } from "./providers/mock";
import { coingeckoProvider } from "./providers/coingecko";
import { binanceProvider } from "./providers/binance";
import { finnhubProvider } from "./providers/finnhub";
import { alphaVantageProvider } from "./providers/alpha-vantage";
import { twelveDataProvider } from "./providers/twelve-data";
import { polygonProvider } from "./providers/polygon";
import { yahooProvider } from "./providers/yahoo";
import { forexProvider } from "./providers/forex";
import { tadawulProvider } from "./providers/tadawul";
import { isEconomicCalendarConfigured, isNewsConfigured } from "./providers/news";

const ALL_PROVIDERS: MarketDataProvider[] = [
  coingeckoProvider,
  binanceProvider,
  finnhubProvider,
  polygonProvider,
  twelveDataProvider,
  alphaVantageProvider,
  yahooProvider,
  forexProvider,
  tadawulProvider,
  mockProvider,
];

function providersForAsset(assetClass: AssetClass): MarketDataProvider[] {
  switch (assetClass) {
    case "crypto":
      return [coingeckoProvider, binanceProvider, mockProvider];
    case "forex":
      return [forexProvider, alphaVantageProvider, yahooProvider, mockProvider];
    case "saudi":
      return [tadawulProvider, yahooProvider, mockProvider];
    case "commodity":
      return [polygonProvider, alphaVantageProvider, yahooProvider, mockProvider];
    case "etf":
    case "index":
    case "stock":
      return [finnhubProvider, polygonProvider, twelveDataProvider, alphaVantageProvider, yahooProvider, mockProvider];
    default:
      return [yahooProvider, mockProvider];
  }
}

async function tryProviders<T>(
  providers: MarketDataProvider[],
  fn: (p: MarketDataProvider) => Promise<T | null>
): Promise<MarketDataResult<T> | null> {
  let lastReason = "No provider available";
  for (const provider of providers) {
    if (provider.id !== "mock" && !provider.isConfigured() && provider.id !== "yahoo" && provider.id !== "coingecko" && provider.id !== "binance") {
      continue;
    }
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
          fallbackReason: provider.id === "mock" ? lastReason : undefined,
        };
      }
    } catch {
      lastReason = `${provider.name} failed`;
    }
  }
  return null;
}

export async function unifiedSearch(query: string, limit = 20): Promise<SymbolSearchResult[]> {
  const local = searchCatalog(query, limit);
  const remoteSets = await Promise.all(
    [finnhubProvider, twelveDataProvider, coingeckoProvider].map((p) =>
      p.isConfigured() || p.id === "coingecko" ? p.searchSymbols(query, limit) : Promise.resolve([])
    )
  );
  const merged = new Map<string, SymbolSearchResult>();
  for (const r of [...remoteSets.flat(), ...local]) merged.set(r.symbol, r);
  return [...merged.values()].slice(0, limit);
}

export async function unifiedQuote(symbol: string): Promise<MarketDataResult<NormalizedQuote>> {
  const assetClass = assetClassForSymbol(symbol);
  const providers = providersForAsset(assetClass);
  const result = await tryProviders(providers, (p) => p.getQuote(symbol));
  if (result) return result as MarketDataResult<NormalizedQuote>;
  const mock = await mockProvider.getQuote(symbol);
  return { data: mock!, source: "mock", isDemoData: true, fallbackReason: "All providers failed" };
}

export async function unifiedCandles(
  symbol: string,
  timeframe = "1Day",
  limit = 90
): Promise<MarketDataResult<NormalizedCandle[]>> {
  const assetClass = assetClassForSymbol(symbol);
  const providers = providersForAsset(assetClass);
  const result = await tryProviders(providers, (p) => p.getCandles(symbol, timeframe, limit));
  if (result) return result as MarketDataResult<NormalizedCandle[]>;
  const mock = await mockProvider.getCandles(symbol, timeframe, limit);
  return { data: mock!, source: "mock", isDemoData: true, fallbackReason: "All providers failed" };
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
    quotesMeta: quotes.map((q) => ({ symbol: q.data.symbol, source: q.source, isDemoData: q.isDemoData })),
  };
}

export function getProviderHealth(): ProviderHealth[] {
  return [
    { id: "mock", name: PROVIDER_LABELS.mock, assetClasses: ["stock", "crypto", "forex", "saudi", "commodity", "index", "etf"], status: "live", hasApiKey: true, description: "Deterministic demo OHLCV — always available" },
    { id: "coingecko", name: PROVIDER_LABELS.coingecko, assetClasses: ["crypto"], status: "live", hasApiKey: true, description: "Public crypto prices — no key required" },
    { id: "binance", name: PROVIDER_LABELS.binance, assetClasses: ["crypto"], status: "live", hasApiKey: true, description: "Public Binance market data" },
    { id: "yahoo", name: PROVIDER_LABELS.yahoo, assetClasses: ["stock", "etf", "index", "commodity", "forex", "saudi"], status: "live", hasApiKey: true, description: "Unofficial Yahoo Finance fallback" },
    { id: "finnhub", name: PROVIDER_LABELS.finnhub, assetClasses: ["stock", "etf"], status: hasKey("FINNHUB_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("FINNHUB_API_KEY"), description: "US equities — FINNHUB_API_KEY" },
    { id: "polygon", name: PROVIDER_LABELS.polygon, assetClasses: ["stock", "etf", "crypto"], status: hasKey("POLYGON_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("POLYGON_API_KEY"), description: "Polygon.io — POLYGON_API_KEY" },
    { id: "alpha_vantage", name: PROVIDER_LABELS.alpha_vantage, assetClasses: ["stock", "forex", "commodity"], status: hasKey("ALPHA_VANTAGE_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("ALPHA_VANTAGE_API_KEY"), description: "Alpha Vantage — ALPHA_VANTAGE_API_KEY" },
    { id: "twelve_data", name: PROVIDER_LABELS.twelve_data, assetClasses: ["stock", "forex", "crypto"], status: hasKey("TWELVE_DATA_API_KEY") ? "live" : "requires_key", hasApiKey: hasKey("TWELVE_DATA_API_KEY"), description: "Twelve Data — TWELVE_DATA_API_KEY" },
    { id: "forex", name: PROVIDER_LABELS.forex, assetClasses: ["forex"], status: hasKey("FOREX_PROVIDER_KEY") ? "live" : "requires_key", hasApiKey: hasKey("FOREX_PROVIDER_KEY"), description: "Forex feed — FOREX_PROVIDER_KEY" },
    { id: "tadawul", name: PROVIDER_LABELS.tadawul, assetClasses: ["saudi"], status: hasKey("TADAWUL_PROVIDER_KEY") ? "live" : "ready", hasApiKey: hasKey("TADAWUL_PROVIDER_KEY"), description: "Saudi Tadawul — TADAWUL_PROVIDER_KEY or Yahoo .SR" },
    { id: "news", name: PROVIDER_LABELS.news, assetClasses: ["stock", "crypto", "forex", "saudi"], status: isNewsConfigured() ? "live" : "requires_key", hasApiKey: isNewsConfigured(), description: "News sentiment — NEWS_API_KEY" },
    { id: "economic_calendar", name: PROVIDER_LABELS.economic_calendar, assetClasses: ["stock", "forex"], status: isEconomicCalendarConfigured() ? "live" : "requires_key", hasApiKey: isEconomicCalendarConfigured(), description: "Macro events — ECONOMIC_CALENDAR_API_KEY" },
  ];
}

export function getOverviewDataMode(): "mock" | "live" | "mixed" {
  return isAnyLiveKeyPresent() ? "mixed" : "mock";
}

export function resolveExchange(symbol: string): string {
  return getCatalogEntry(symbol)?.exchange ?? "US";
}

export { ALL_PROVIDERS };
