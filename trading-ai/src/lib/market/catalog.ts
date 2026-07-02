import type { AssetClass } from "@/types/trading";
import {
  getAllActiveAssets,
  getAssetBySymbol,
  normalizeUniverseSymbol,
  universeCategoryToAssetClass,
} from "@/lib/markets/asset-universe";
import { MOCK_UNIVERSE } from "@/lib/data/mock-market";
import type { SymbolSearchResult } from "./types";

export const SYMBOL_CATALOG: SymbolSearchResult[] = getAllActiveAssets().map((a) => ({
  symbol: a.symbol,
  name: a.name,
  assetClass: universeCategoryToAssetClass(a),
  exchange: a.exchange,
  currency: a.currency,
  region:
    a.region ??
    (a.country === "SA" ? "SA" : a.country === "US" ? "US" : "Global"),
}));

export function searchCatalog(query: string, limit = 20): SymbolSearchResult[] {
  const q = query.trim().toUpperCase();
  if (!q) return SYMBOL_CATALOG.slice(0, limit);
  return SYMBOL_CATALOG.filter(
    (s) =>
      s.symbol.toUpperCase().includes(q) ||
      s.name.toUpperCase().includes(q) ||
      s.assetClass.toUpperCase().includes(q)
  ).slice(0, limit);
}

export function getCatalogEntry(symbol: string): SymbolSearchResult | undefined {
  const asset = getAssetBySymbol(symbol);
  if (asset) {
    return {
      symbol: asset.symbol,
      name: asset.name,
      assetClass: universeCategoryToAssetClass(asset),
      exchange: asset.exchange,
      currency: asset.currency,
    };
  }
  const key = normalizeUniverseSymbol(symbol);
  const meta = MOCK_UNIVERSE[key];
  if (!meta) return undefined;
  return {
    symbol: key,
    name: meta.name,
    assetClass: meta.assetClass,
    exchange: meta.exchange,
    currency: meta.currency,
  };
}

export function assetClassForSymbol(symbol: string): AssetClass {
  const asset = getAssetBySymbol(symbol);
  if (asset) return universeCategoryToAssetClass(asset);
  return MOCK_UNIVERSE[normalizeUniverseSymbol(symbol)]?.assetClass ?? "stock";
}

export const COINGECKO_IDS: Record<string, string> = {
  BTCUSD: "bitcoin",
  ETHUSD: "ethereum",
  SOLUSD: "solana",
  BNBUSD: "binancecoin",
  XRPUSD: "ripple",
  ADAUSD: "cardano",
  DOGEUSD: "dogecoin",
  AVAXUSD: "avalanche-2",
};

export const BINANCE_SYMBOLS: Record<string, string> = {
  BTCUSD: "BTCUSDT",
  ETHUSD: "ETHUSDT",
  SOLUSD: "SOLUSDT",
  BNBUSD: "BNBUSDT",
  XRPUSD: "XRPUSDT",
  ADAUSD: "ADAUSDT",
  DOGEUSD: "DOGEUSDT",
  AVAXUSD: "AVAXUSDT",
};
