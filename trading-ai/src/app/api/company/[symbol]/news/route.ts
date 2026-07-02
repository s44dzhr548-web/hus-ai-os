import { NextResponse } from "next/server";
import { buildNewsItems } from "@/lib/intelligence/company-profile";
import { resolveRouteSymbol } from "../../_lib/resolve-symbol";

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const resolved = resolveRouteSymbol(raw);
  if ("error" in resolved) return resolved.error;
  const news = await buildNewsItems(resolved.symbol);
  return NextResponse.json(news);
}
