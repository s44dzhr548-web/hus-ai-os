import { NextResponse } from "next/server";
import { buildAssetFlowProfile } from "@/lib/intelligence/smart-money-engine";
import { resolveProfileSymbol } from "@/lib/intelligence/symbol-resolver";
import { getAssetBySymbol } from "@/lib/markets/asset-universe";

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const symbol = resolveProfileSymbol(raw);
  if (!symbol || !getAssetBySymbol(symbol)) {
    return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
  }

  const flow = await buildAssetFlowProfile(symbol);
  return NextResponse.json({ flow, executionMode: "paper_only", brokerEnabled: false });
}
