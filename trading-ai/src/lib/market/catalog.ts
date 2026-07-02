import type { AssetClass } from "@/types/trading";
import { MOCK_UNIVERSE } from "@/lib/data/mock-market";
import type { SymbolSearchResult } from "./types";

export const SYMBOL_CATALOG: SymbolSearchResult[] = Object.entries(MOCK_UNIVERSE).map(
  ([symbol, meta]) => ({
    symbol,
    name: meta.name,
    assetClass: meta.assetClass,
    exchange: meta.exchange,
    currency: meta.currency,
    region:
      meta.assetClass === "saudi"
        ? "SA"
        : meta.assetClass === "forex"
          ? "Global"
          : meta.assetClass === "crypto"
            ? "Global"
            : "US",
  })
);

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
  const meta = MOCK_UNIVERSE[symbol];
  if (!meta) return undefined;
  return {
    symbol,
    name: meta.name,
    assetClass: meta.assetClass,
    exchange: meta.exchange,
    currency: meta.currency,
  };
}

export function assetClassForSymbol(symbol: string): AssetClass {
  return MOCK_UNIVERSE[symbol]?.assetClass ?? "stock";
}

export const COINGECKO_IDS: Record<string, string> = {
  BTCUSD: "bitcoin",
  ETHUSD: "ethereum",
  SOLUSD: "solana",
};

export const BINANCE_SYMBOLS: Record<string, string> = {
  BTCUSD: "BTCUSDT",
  ETHUSD: "ETHUSDT",
  SOLUSD: "SOLUSDT",
};
