import type { WatchlistItem } from "@/types/trading";
import { getAssetBySymbol } from "@/lib/markets/asset-universe";
import { universeCategoryToAssetClass } from "@/lib/markets/asset-universe";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const DEFAULT_SYMBOLS = ["AAPL", "BTCUSD", "2222", "MSFT", "EURUSD"];

declare global {
  // eslint-disable-next-line no-var
  var __watchlistStore: WatchlistItem[] | undefined;
}

function seedWatchlist(): WatchlistItem[] {
  return DEFAULT_SYMBOLS.map((symbol) => {
    const asset = getAssetBySymbol(symbol);
    return {
      symbol,
      name: asset?.name ?? symbol,
      assetClass: asset ? universeCategoryToAssetClass(asset) : "stock",
      addedAt: new Date().toISOString(),
    };
  });
}

function getStore(): WatchlistItem[] {
  if (!globalThis.__watchlistStore) globalThis.__watchlistStore = seedWatchlist();
  return globalThis.__watchlistStore;
}

export function getWatchlist(): WatchlistItem[] {
  return [...getStore()];
}

export function addToWatchlist(symbolInput: string): { ok: boolean; item?: WatchlistItem; error?: string } {
  const symbol = symbolInput.toUpperCase().replace(/\.SR$/i, "");
  const asset = getAssetBySymbol(symbol);
  if (!asset) return { ok: false, error: "Symbol not in asset universe" };

  const store = getStore();
  if (store.some((w) => w.symbol === asset.symbol)) {
    return { ok: true, item: store.find((w) => w.symbol === asset.symbol)! };
  }

  const item: WatchlistItem = {
    symbol: asset.symbol,
    name: asset.name,
    assetClass: universeCategoryToAssetClass(asset),
    addedAt: new Date().toISOString(),
  };
  store.unshift(item);
  return { ok: true, item };
}

export function watchlistPersistenceStatus() {
  return {
    configured: isSupabaseConfigured(),
    mode: isSupabaseConfigured() ? "supabase_ready" : "memory_fallback",
    note: isSupabaseConfigured()
      ? "Supabase configured — watchlist schema available; runtime uses memory until user auth wiring."
      : "Persistence not configured — using in-memory watchlist.",
  };
}
