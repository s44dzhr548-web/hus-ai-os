import type { AssetClass } from "@/types/trading";
import type { ProviderId } from "../types";

export type MarketCategory =
  | "saudi"
  | "us_stock"
  | "global_stock"
  | "crypto"
  | "forex"
  | "index"
  | "commodity"
  | "economic_calendar"
  | "financial_statements"
  | "news";

export type ChainRole = "primary" | "secondary" | "backup" | "fourth";

export interface ProviderChainEntry {
  role: ChainRole;
  id: ProviderId;
  labelEn: string;
  labelAr: string;
  envKey?: string;
  costPerCallUsd: number;
  monthlyFreeQuota?: number;
  /** When set, uses this implementation if primary id is a licensed stub without direct API */
  delegateTo?: ProviderId;
}

export const MARKET_PROVIDER_CHAINS: Record<MarketCategory, ProviderChainEntry[]> = {
  saudi: [
    { role: "primary", id: "tadawul", labelEn: "Tadawul Licensed", labelAr: "تداول مرخص", envKey: "TADAWUL_PROVIDER_KEY", costPerCallUsd: 0.002, delegateTo: "yahoo" },
    { role: "secondary", id: "yahoo", labelEn: "Mubasher / Yahoo .SR", labelAr: "مباشر / Yahoo", costPerCallUsd: 0, monthlyFreeQuota: 100000 },
    { role: "backup", id: "alpha_vantage", labelEn: "Alpha Vantage", labelAr: "Alpha Vantage", envKey: "ALPHA_VANTAGE_API_KEY", costPerCallUsd: 0.0008, monthlyFreeQuota: 500 },
  ],
  us_stock: [
    { role: "primary", id: "polygon", labelEn: "Polygon.io", labelAr: "Polygon.io", envKey: "POLYGON_API_KEY", costPerCallUsd: 0.0002, monthlyFreeQuota: 5000 },
    { role: "secondary", id: "finnhub", labelEn: "Finnhub", labelAr: "Finnhub", envKey: "FINNHUB_API_KEY", costPerCallUsd: 0, monthlyFreeQuota: 60 },
    { role: "backup", id: "yahoo", labelEn: "Financial Modeling Prep (via Yahoo fallback)", labelAr: "FMP (احتياط Yahoo)", costPerCallUsd: 0, delegateTo: "yahoo" },
    { role: "fourth", id: "twelve_data", labelEn: "Twelve Data", labelAr: "Twelve Data", envKey: "TWELVE_DATA_API_KEY", costPerCallUsd: 0.001, monthlyFreeQuota: 800 },
  ],
  global_stock: [
    { role: "primary", id: "yahoo", labelEn: "LSEG Refinitiv (via Yahoo global)", labelAr: "Refinitiv (عبر Yahoo)", costPerCallUsd: 0, delegateTo: "yahoo" },
    { role: "secondary", id: "finnhub", labelEn: "Tiingo (via Finnhub)", labelAr: "Tiingo (عبر Finnhub)", envKey: "FINNHUB_API_KEY", costPerCallUsd: 0, delegateTo: "finnhub" },
    { role: "backup", id: "alpha_vantage", labelEn: "Alpha Vantage", labelAr: "Alpha Vantage", envKey: "ALPHA_VANTAGE_API_KEY", costPerCallUsd: 0.0008 },
  ],
  crypto: [
    { role: "primary", id: "binance", labelEn: "Binance", labelAr: "Binance", costPerCallUsd: 0, monthlyFreeQuota: 1200 },
    { role: "secondary", id: "coingecko", labelEn: "CoinGecko", labelAr: "CoinGecko", costPerCallUsd: 0, monthlyFreeQuota: 10000 },
    { role: "backup", id: "polygon", labelEn: "CoinMarketCap (via Polygon crypto)", labelAr: "CoinMarketCap", envKey: "POLYGON_API_KEY", costPerCallUsd: 0.0002, delegateTo: "coingecko" },
  ],
  forex: [
    { role: "primary", id: "forex", labelEn: "OANDA (keyed forex)", labelAr: "OANDA", envKey: "FOREX_PROVIDER_KEY", costPerCallUsd: 0.001, delegateTo: "frankfurter" },
    { role: "secondary", id: "twelve_data", labelEn: "Twelve Data", labelAr: "Twelve Data", envKey: "TWELVE_DATA_API_KEY", costPerCallUsd: 0.001 },
    { role: "backup", id: "alpha_vantage", labelEn: "Alpha Vantage", labelAr: "Alpha Vantage", envKey: "ALPHA_VANTAGE_API_KEY", costPerCallUsd: 0.0008 },
  ],
  index: [
    { role: "primary", id: "polygon", labelEn: "Polygon Indices", labelAr: "Polygon", envKey: "POLYGON_API_KEY", costPerCallUsd: 0.0002 },
    { role: "secondary", id: "yahoo", labelEn: "Trading Economics (via Yahoo)", labelAr: "Trading Economics", costPerCallUsd: 0, delegateTo: "yahoo" },
  ],
  commodity: [
    { role: "primary", id: "yahoo", labelEn: "Trading Economics Commodities", labelAr: "Trading Economics", costPerCallUsd: 0, delegateTo: "yahoo" },
    { role: "secondary", id: "twelve_data", labelEn: "Twelve Data", labelAr: "Twelve Data", envKey: "TWELVE_DATA_API_KEY", costPerCallUsd: 0.001 },
  ],
  economic_calendar: [
    { role: "primary", id: "economic_calendar", labelEn: "Trading Economics Calendar", labelAr: "Trading Economics", envKey: "ECONOMIC_CALENDAR_API_KEY", costPerCallUsd: 0.001 },
    { role: "secondary", id: "finnhub", labelEn: "Finnhub Calendar", labelAr: "Finnhub", envKey: "FINNHUB_API_KEY", costPerCallUsd: 0 },
    { role: "backup", id: "yahoo", labelEn: "FMP Calendar (fallback)", labelAr: "FMP", costPerCallUsd: 0, delegateTo: "yahoo" },
  ],
  financial_statements: [
    { role: "primary", id: "finnhub", labelEn: "Financial Modeling Prep (via Finnhub)", labelAr: "FMP", envKey: "FINNHUB_API_KEY", costPerCallUsd: 0 },
    { role: "secondary", id: "yahoo", labelEn: "Tiingo (via Yahoo fundamentals proxy)", labelAr: "Tiingo", costPerCallUsd: 0, delegateTo: "yahoo" },
    { role: "backup", id: "alpha_vantage", labelEn: "Finnhub backup", labelAr: "Finnhub", envKey: "ALPHA_VANTAGE_API_KEY", costPerCallUsd: 0.0008 },
  ],
  news: [
    { role: "primary", id: "news", labelEn: "Finnhub News", labelAr: "Finnhub", envKey: "NEWS_API_KEY", costPerCallUsd: 0 },
    { role: "secondary", id: "news", labelEn: "NewsAPI", labelAr: "NewsAPI", envKey: "NEWS_API_KEY", costPerCallUsd: 0.001 },
    { role: "backup", id: "yahoo", labelEn: "Google News RSS (Yahoo headlines)", labelAr: "Google News RSS", costPerCallUsd: 0, delegateTo: "yahoo" },
  ],
};

export function categoryForAssetClass(assetClass: AssetClass): MarketCategory {
  switch (assetClass) {
    case "saudi":
      return "saudi";
    case "crypto":
      return "crypto";
    case "forex":
      return "forex";
    case "commodity":
      return "commodity";
    case "index":
      return "index";
    case "etf":
      return "us_stock";
    case "stock":
      return "us_stock";
    default:
      return "global_stock";
  }
}

export function chainForAssetClass(assetClass: AssetClass): ProviderChainEntry[] {
  return MARKET_PROVIDER_CHAINS[categoryForAssetClass(assetClass)];
}
