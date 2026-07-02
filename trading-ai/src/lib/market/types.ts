import type { AssetClass, MarketBar, MarketAsset } from "@/types/trading";

export type DataSourceMode = "live" | "demo";
export type ProviderId =
  | "mock"
  | "alpha_vantage"
  | "twelve_data"
  | "finnhub"
  | "polygon"
  | "yahoo"
  | "coingecko"
  | "binance"
  | "forex"
  | "tadawul"
  | "news"
  | "economic_calendar";

export type MarketSession = "open" | "closed" | "pre_market" | "after_hours" | "unknown";

export interface NormalizedQuote extends MarketAsset {
  source: ProviderId;
  isDemoData: boolean;
  timestamp: string;
  bid?: number;
  ask?: number;
  high24h?: number;
  low24h?: number;
}

export interface NormalizedCandle extends MarketBar {
  source: ProviderId;
  isDemoData: boolean;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  region?: string;
}

export interface MarketStatusInfo {
  exchange: string;
  timezone: string;
  session: MarketSession;
  isOpen: boolean;
  localTime: string;
  nextOpen?: string;
  nextClose?: string;
}

export interface ProviderHealth {
  id: ProviderId;
  name: string;
  assetClasses: AssetClass[];
  status: "mock" | "live" | "ready" | "requires_key" | "requires_oauth" | "disabled";
  hasApiKey: boolean;
  description: string;
}

export interface MarketDataResult<T> {
  data: T;
  source: ProviderId;
  isDemoData: boolean;
  fallbackReason?: string;
}

export interface MarketDataProvider {
  id: ProviderId;
  name: string;
  assetClasses: AssetClass[];
  isConfigured(): boolean;
  searchSymbols(query: string, limit?: number): Promise<SymbolSearchResult[]>;
  getQuote(symbol: string): Promise<NormalizedQuote | null>;
  getCandles(symbol: string, timeframe?: string, limit?: number): Promise<NormalizedCandle[] | null>;
  getMarketStatus(exchange: string): Promise<MarketStatusInfo | null>;
}
