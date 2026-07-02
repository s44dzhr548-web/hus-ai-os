import { NextResponse } from "next/server";
import { resolveProfileSymbol } from "@/lib/intelligence/symbol-resolver";
import { getAssetBySymbol } from "@/lib/markets/asset-universe";

export function resolveRouteSymbol(raw: string) {
  const symbol = resolveProfileSymbol(raw);
  if (!symbol || !getAssetBySymbol(symbol)) {
    return { error: NextResponse.json({ error: "Symbol not found in asset universe" }, { status: 404 }) };
  }
  return { symbol };
}
