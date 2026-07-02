import { NextResponse } from "next/server";
import { buildRisk, buildTechnical } from "@/lib/intelligence/company-profile";
import { runAIAnalysis } from "@/lib/ai/analysis-engine";
import { resolveRouteSymbol } from "../../_lib/resolve-symbol";

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const resolved = resolveRouteSymbol(raw);
  if ("error" in resolved) return resolved.error;

  const [technical, analysis] = await Promise.all([
    buildTechnical(resolved.symbol),
    runAIAnalysis(resolved.symbol, "en"),
  ]);
  const risk = buildRisk(resolved.symbol, technical, analysis.recommendation, analysis.riskLevel);
  return NextResponse.json({ risk, executionMode: "paper_only" });
}
