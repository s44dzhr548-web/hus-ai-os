import type { ProviderId } from "./types";

export function envKey(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : undefined;
}

export const ENV_KEYS = {
  MARKET_DATA_MODE: "MARKET_DATA_MODE",
  ALPHA_VANTAGE_API_KEY: "ALPHA_VANTAGE_API_KEY",
  TWELVE_DATA_API_KEY: "TWELVE_DATA_API_KEY",
  FINNHUB_API_KEY: "FINNHUB_API_KEY",
  POLYGON_API_KEY: "POLYGON_API_KEY",
  NEWS_API_KEY: "NEWS_API_KEY",
  CRYPTO_PROVIDER_KEY: "CRYPTO_PROVIDER_KEY",
  FOREX_PROVIDER_KEY: "FOREX_PROVIDER_KEY",
  TADAWUL_PROVIDER_KEY: "TADAWUL_PROVIDER_KEY",
  ECONOMIC_CALENDAR_API_KEY: "ECONOMIC_CALENDAR_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ALPACA_API_KEY: "ALPACA_API_KEY",
  ALPACA_API_SECRET: "ALPACA_API_SECRET",
} as const;

export function hasKey(key: keyof typeof ENV_KEYS): boolean {
  return Boolean(envKey(ENV_KEYS[key]));
}

/** Real market data mode is ON by default. Set MARKET_DATA_MODE=demo to force demo-only. */
export function isRealMarketDataMode(): boolean {
  const mode = envKey("MARKET_DATA_MODE")?.toLowerCase();
  return mode !== "demo" && mode !== "mock";
}

export const PUBLIC_LIVE_PROVIDERS: ProviderId[] = [
  "coingecko",
  "binance",
  "yahoo",
  "frankfurter",
];

export const KEYED_PROVIDER_ENV: Partial<Record<ProviderId, keyof typeof ENV_KEYS>> = {
  finnhub: "FINNHUB_API_KEY",
  polygon: "POLYGON_API_KEY",
  alpha_vantage: "ALPHA_VANTAGE_API_KEY",
  twelve_data: "TWELVE_DATA_API_KEY",
  forex: "FOREX_PROVIDER_KEY",
  tadawul: "TADAWUL_PROVIDER_KEY",
  news: "NEWS_API_KEY",
  economic_calendar: "ECONOMIC_CALENDAR_API_KEY",
};

export function getMissingApiKeys(): string[] {
  return Object.entries(KEYED_PROVIDER_ENV)
    .filter(([, envName]) => envName && !hasKey(envName))
    .map(([, envName]) => envName!);
}

export function isAnyLiveKeyPresent(): boolean {
  return Object.entries(KEYED_PROVIDER_ENV).some(([, k]) => k && hasKey(k));
}

export function getDataMode(): "live" | "mock" | "mixed" {
  if (!isRealMarketDataMode()) return "mock";
  if (isAnyLiveKeyPresent()) return "mixed";
  return "live";
}

export const EXCHANGE_TIMEZONES: Record<string, string> = {
  NASDAQ: "America/New_York",
  NYSE: "America/New_York",
  Tadawul: "Asia/Riyadh",
  FX: "UTC",
  Crypto: "UTC",
  COMEX: "America/New_York",
  CME: "America/Chicago",
  MOCK: "UTC",
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  mock: "Mock Market Data (fallback only)",
  alpha_vantage: "Alpha Vantage",
  twelve_data: "Twelve Data",
  finnhub: "Finnhub",
  polygon: "Polygon.io",
  yahoo: "Yahoo Finance",
  coingecko: "CoinGecko",
  binance: "Binance Public",
  forex: "Forex Provider (keyed)",
  frankfurter: "Frankfurter ECB",
  tadawul: "Tadawul / Saudi",
  news: "News API",
  economic_calendar: "Economic Calendar",
};
