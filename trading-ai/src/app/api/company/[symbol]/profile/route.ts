import { NextResponse } from "next/server";
import { getCompanyIntelligenceProfile } from "@/lib/intelligence/company-profile";
import { resolveRouteSymbol } from "../../_lib/resolve-symbol";

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const resolved = resolveRouteSymbol(raw);
  if ("error" in resolved) return resolved.error;

  const lang = new URL(_request.url).searchParams.get("lang") === "ar" ? "ar" : "en";
  const profile = await getCompanyIntelligenceProfile(resolved.symbol, lang);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile, executionMode: "paper_only", brokerEnabled: false });
}
