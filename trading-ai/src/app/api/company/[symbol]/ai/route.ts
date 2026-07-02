import { NextResponse } from "next/server";
import { runAIAnalysis } from "@/lib/ai/analysis-engine";
import { buildQuoteDetail } from "@/lib/intelligence/company-profile";
import { resolveRouteSymbol } from "../../_lib/resolve-symbol";

export async function GET(request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const resolved = resolveRouteSymbol(raw);
  if ("error" in resolved) return resolved.error;

  const lang = new URL(request.url).searchParams.get("lang") === "ar" ? "ar" : "en";
  const [analysis, quote] = await Promise.all([
    runAIAnalysis(resolved.symbol, lang),
    buildQuoteDetail(resolved.symbol),
  ]);

  return NextResponse.json({
    symbol: resolved.symbol,
    recommendation: analysis.recommendation,
    aiScore: analysis.signalScore,
    confidence: analysis.confidence,
    riskLevel: analysis.riskLevel,
    expectedUpsidePct: Number(((analysis.signalScore - 50) * 0.2).toFixed(2)),
    explainability: analysis.explainability,
    whyNow: analysis.whyNow,
    marketConsensus: analysis.marketConsensus,
    quote,
    executionMode: "paper_only",
    brokerEnabled: false,
  });
}
