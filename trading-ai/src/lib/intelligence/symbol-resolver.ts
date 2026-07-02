import { getAssetBySymbol, normalizeUniverseSymbol } from "@/lib/markets/asset-universe";

/** Resolve URL path segment to internal universe symbol (2222.SR → 2222, BTC-USD → BTCUSD). */
export function resolveProfileSymbol(raw: string): string | null {
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;

  const direct = normalizeUniverseSymbol(decoded);
  if (getAssetBySymbol(direct)) return direct;

  const compact = decoded.toUpperCase().replace(/-/g, "");
  if (getAssetBySymbol(compact)) return compact;

  const upper = decoded.toUpperCase();
  if (getAssetBySymbol(upper)) return upper;

  return getAssetBySymbol(direct) ? direct : null;
}

export function profilePathForSymbol(symbol: string, displaySymbol?: string): string {
  return `/dashboard/markets/${encodeURIComponent(displaySymbol ?? symbol)}`;
}
