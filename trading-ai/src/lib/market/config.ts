import type { ProviderId } from "./types";

export function envKey(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : undefined;
}

export const ENV_KEYS = {
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

export function getDataMode(): "live" | "mock" | "mixed" {
  if (isAnyLiveKeyPresent()) return "mixed";
  return "mock";
}

export function isAnyLiveKeyPresent(): boolean {
  return Object.values(ENV_KEYS).some((k) => hasKey(k as keyof typeof ENV_KEYS));
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
  mock: "Mock Market Data",
  alpha_vantage: "Alpha Vantage",
  twelve_data: "Twelve Data",
  finnhub: "Finnhub",
  polygon: "Polygon.io",
  yahoo: "Yahoo Finance",
  coingecko: "CoinGecko",
  binance: "Binance Public",
  forex: "Forex Provider",
  tadawul: "Tadawul / Saudi",
  news: "News API",
  economic_calendar: "Economic Calendar",
};
