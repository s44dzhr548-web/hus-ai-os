import { getAssetBySymbol } from "@/lib/markets/asset-universe";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type SimulationSymbol = {
  symbol: string;
  name: string;
  addedAt: string;
  weightPct: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __portfolioSimulationStore: SimulationSymbol[] | undefined;
}

function getStore(): SimulationSymbol[] {
  if (!globalThis.__portfolioSimulationStore) {
    globalThis.__portfolioSimulationStore = [
      { symbol: "AAPL", name: "Apple Inc.", addedAt: new Date().toISOString(), weightPct: 15 },
      { symbol: "2222", name: "Saudi Aramco", addedAt: new Date().toISOString(), weightPct: 10 },
      { symbol: "BTCUSD", name: "Bitcoin / USD", addedAt: new Date().toISOString(), weightPct: 5 },
    ];
  }
  return globalThis.__portfolioSimulationStore;
}

export function getSimulationSymbols(): SimulationSymbol[] {
  return [...getStore()];
}

export function addToPortfolioSimulation(symbolInput: string, weightPct = 5) {
  const symbol = symbolInput.toUpperCase().replace(/\.SR$/i, "");
  const asset = getAssetBySymbol(symbol);
  if (!asset) return { ok: false as const, error: "Symbol not in asset universe" };

  const store = getStore();
  const existing = store.find((s) => s.symbol === asset.symbol);
  if (existing) {
    existing.weightPct = weightPct;
    existing.addedAt = new Date().toISOString();
    return { ok: true as const, item: existing, updated: true };
  }

  const item: SimulationSymbol = {
    symbol: asset.symbol,
    name: asset.name,
    addedAt: new Date().toISOString(),
    weightPct,
  };
  store.unshift(item);
  return { ok: true as const, item, updated: false };
}

export function simulationPersistenceStatus() {
  return {
    configured: isSupabaseConfigured(),
    mode: isSupabaseConfigured() ? "supabase_ready" : "memory_fallback",
  };
}
