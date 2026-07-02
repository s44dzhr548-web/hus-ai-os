import { NextResponse } from "next/server";
import { buildFinancials } from "@/lib/intelligence/company-profile";
import { resolveRouteSymbol } from "../../_lib/resolve-symbol";

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const resolved = resolveRouteSymbol(raw);
  if ("error" in resolved) return resolved.error;
  return NextResponse.json({ financials: buildFinancials(resolved.symbol) });
}
