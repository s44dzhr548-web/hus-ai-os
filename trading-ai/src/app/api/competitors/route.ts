import { NextResponse } from "next/server";
import {
  COMPETITORS,
  FILTER_LABELS,
  ROADMAP,
  filterCompetitors,
  getComparisonMatrix,
  getCompetitiveAdvantages,
  getFeatureGapAnalysis,
} from "@/lib/competitors/data";
import type { CompetitorFilterTag } from "@/lib/competitors/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = (searchParams.get("filters") ?? "")
    .split(",")
    .filter(Boolean) as CompetitorFilterTag[];
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";

  return NextResponse.json({
    count: COMPETITORS.length,
    competitors: filterCompetitors(filters),
    matrix: getComparisonMatrix(locale),
    gapAnalysis: getFeatureGapAnalysis(),
    advantages: getCompetitiveAdvantages(),
    roadmap: ROADMAP,
    filters: FILTER_LABELS,
  });
}
