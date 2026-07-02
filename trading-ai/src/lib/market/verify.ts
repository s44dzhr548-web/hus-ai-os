import type { AssetClass } from "@/types/trading";
import type { ProviderId } from "./types";
import {
  getDataMode,
  getMissingApiKeys,
  hasKey,
  isRealMarketDataMode,
  KEYED_PROVIDER_ENV,
  PROVIDER_LABELS,
  PUBLIC_LIVE_PROVIDERS,
} from "./config";
import { LIVE_PROBE_SYMBOLS } from "./symbols";
import { unifiedQuote } from "./unified";
import { fetchNews, fetchEconomicCalendar } from "./providers/news";
import { coingeckoProvider } from "./providers/coingecko";
import { binanceProvider } from "./providers/binance";
import { yahooProvider } from "./providers/yahoo";
import { frankfurterProvider } from "./providers/frankfurter";
import { finnhubProvider } from "./providers/finnhub";
import { polygonProvider } from "./providers/polygon";
import { alphaVantageProvider } from "./providers/alpha-vantage";
import { twelveDataProvider } from "./providers/twelve-data";
import { forexProvider } from "./providers/forex";
import { tadawulProvider } from "./providers/tadawul";
import { setCached, getCached } from "./cache";

export type ProviderVerification = {
  id: ProviderId;
  name: string;
  connected: boolean;
  isLive: boolean;
  requiresKey: boolean;
  hasApiKey: boolean;
  missingEnv?: string;
  probe?: string;
  error?: string;
  latencyMs?: number;
};

export type MarketVerificationReport = {
  realMarketDataMode: boolean;
  dataMode: "live" | "mock" | "mixed";
  brokerExecution: "DISABLED";
  paperTradingOnly: true;
  verifiedAt: string;
  providers: ProviderVerification[];
  connectedProviders: ProviderId[];
  missingApiKeys: string[];
  liveMarkets: { market: string; symbol: string; source: ProviderId; price?: number }[];
  demoMarkets: { market: string; symbol: string; reason: string }[];
};

const CACHE_KEY = "provider-verification-report";
const CACHE_TTL = 120_000;

async function probeQuote(symbol: string): Promise<{ ok: boolean; source?: ProviderId; price?: number; isDemo: boolean }> {
  const result = await unifiedQuote(symbol);
  return {
    ok: !result.isDemoData,
    source: result.source,
    price: result.data.price,
    isDemo: result.isDemoData,
  };
}

async function verifyProvider(
  id: ProviderId,
  probeFn?: () => Promise<boolean>
): Promise<ProviderVerification> {
  const envName = KEYED_PROVIDER_ENV[id];
  const requiresKey = Boolean(envName);
  const hasApiKey = requiresKey ? hasKey(envName!) : true;
  const start = Date.now();
  let connected = false;
  let error: string | undefined;

  if (requiresKey && !hasApiKey) {
    return {
      id,
      name: PROVIDER_LABELS[id],
      connected: false,
      isLive: false,
      requiresKey: true,
      hasApiKey: false,
      missingEnv: envName,
      error: "API key not configured",
    };
  }

  if (probeFn) {
    try {
      connected = await probeFn();
      if (!connected) error = "Probe returned no data";
    } catch (e) {
      error = e instanceof Error ? e.message : "Probe failed";
    }
  } else if (PUBLIC_LIVE_PROVIDERS.includes(id)) {
    connected = true;
  }

  return {
    id,
    name: PROVIDER_LABELS[id],
    connected,
    isLive: connected && id !== "mock",
    requiresKey,
    hasApiKey,
    missingEnv: requiresKey && !hasApiKey ? envName : undefined,
    error,
    latencyMs: Date.now() - start,
  };
}

export async function verifyAllProviders(useCache = true): Promise<MarketVerificationReport> {
  if (useCache) {
    const cached = getCached<MarketVerificationReport>(CACHE_KEY);
    if (cached) return cached;
  }

  const providerChecks: ProviderVerification[] = await Promise.all([
    verifyProvider("coingecko", async () => Boolean(await coingeckoProvider.getQuote(LIVE_PROBE_SYMBOLS.crypto))),
    verifyProvider("binance", async () => Boolean(await binanceProvider.getQuote(LIVE_PROBE_SYMBOLS.crypto))),
    verifyProvider("yahoo", async () => Boolean(await yahooProvider.getQuote(LIVE_PROBE_SYMBOLS.usStock))),
    verifyProvider("frankfurter", async () => Boolean(await frankfurterProvider.getQuote(LIVE_PROBE_SYMBOLS.forex))),
    verifyProvider("finnhub", async () => (hasKey("FINNHUB_API_KEY") ? Boolean(await finnhubProvider.getQuote("AAPL")) : false)),
    verifyProvider("polygon", async () => (hasKey("POLYGON_API_KEY") ? Boolean(await polygonProvider.getQuote("AAPL")) : false)),
    verifyProvider("alpha_vantage", async () => (hasKey("ALPHA_VANTAGE_API_KEY") ? Boolean(await alphaVantageProvider.getQuote("AAPL")) : false)),
    verifyProvider("twelve_data", async () => (hasKey("TWELVE_DATA_API_KEY") ? Boolean(await twelveDataProvider.getQuote("AAPL")) : false)),
    verifyProvider("forex", async () => (hasKey("FOREX_PROVIDER_KEY") ? Boolean(await forexProvider.getQuote(LIVE_PROBE_SYMBOLS.forex)) : false)),
    verifyProvider("tadawul", async () => Boolean(await tadawulProvider.getQuote(LIVE_PROBE_SYMBOLS.saudi))),
    verifyProvider("news", async () => {
      const n = await fetchNews("AAPL");
      return !n.isDemoData;
    }),
    verifyProvider("economic_calendar", async () => {
      const e = await fetchEconomicCalendar();
      return !e.isDemoData;
    }),
    verifyProvider("mock", async () => true),
  ]);

  const marketProbes: { market: string; symbol: string; assetClass: AssetClass }[] = [
    { market: "US Stocks", symbol: LIVE_PROBE_SYMBOLS.usStock, assetClass: "stock" },
    { market: "Saudi / Tadawul", symbol: LIVE_PROBE_SYMBOLS.saudi, assetClass: "saudi" },
    { market: "Crypto", symbol: LIVE_PROBE_SYMBOLS.crypto, assetClass: "crypto" },
    { market: "Forex", symbol: LIVE_PROBE_SYMBOLS.forex, assetClass: "forex" },
    { market: "Commodities", symbol: LIVE_PROBE_SYMBOLS.commodity, assetClass: "commodity" },
    { market: "Indices", symbol: LIVE_PROBE_SYMBOLS.index, assetClass: "index" },
    { market: "ETFs", symbol: LIVE_PROBE_SYMBOLS.etf, assetClass: "etf" },
  ];

  const liveMarkets: MarketVerificationReport["liveMarkets"] = [];
  const demoMarkets: MarketVerificationReport["demoMarkets"] = [];

  for (const probe of marketProbes) {
    const q = await probeQuote(probe.symbol);
    if (q.ok && q.source) {
      liveMarkets.push({ market: probe.market, symbol: probe.symbol, source: q.source, price: q.price });
    } else {
      demoMarkets.push({
        market: probe.market,
        symbol: probe.symbol,
        reason: q.isDemo ? `Fallback demo (${q.source})` : "All live providers failed",
      });
    }
  }

  const newsProbe = await fetchNews("AAPL");
  if (!newsProbe.isDemoData) {
    liveMarkets.push({ market: "News", symbol: "AAPL", source: newsProbe.source as ProviderId, price: undefined });
  } else {
    demoMarkets.push({ market: "News", symbol: "AAPL", reason: "NEWS_API_KEY missing and Yahoo RSS unavailable" });
  }

  const calProbe = await fetchEconomicCalendar();
  if (!calProbe.isDemoData) {
    liveMarkets.push({ market: "Economic Calendar", symbol: "GLOBAL", source: calProbe.source as ProviderId });
  } else {
    demoMarkets.push({ market: "Economic Calendar", symbol: "GLOBAL", reason: "Calendar APIs unavailable" });
  }

  const report: MarketVerificationReport = {
    realMarketDataMode: isRealMarketDataMode(),
    dataMode: getDataMode(),
    brokerExecution: "DISABLED",
    paperTradingOnly: true,
    verifiedAt: new Date().toISOString(),
    providers: providerChecks,
    connectedProviders: providerChecks.filter((p) => p.connected && p.id !== "mock").map((p) => p.id),
    missingApiKeys: getMissingApiKeys(),
    liveMarkets,
    demoMarkets,
  };

  setCached(CACHE_KEY, report, CACHE_TTL);
  return report;
}
