import { NextResponse } from "next/server";
import { getEnterpriseCompetitors } from "@/lib/competitors/enterprise-data";
import { COMPETITORS, getComparisonMatrix, getFeatureGapAnalysis, getCompetitiveAdvantages, ROADMAP } from "@/lib/competitors/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  return NextResponse.json({
    enterprise: getEnterpriseCompetitors(),
    platforms: COMPETITORS.length,
    matrix: getComparisonMatrix(locale),
    gapAnalysis: getFeatureGapAnalysis(),
    advantages: getCompetitiveAdvantages(),
    roadmap: ROADMAP,
    husaiNote: locale === "ar" ? "تداول ورقي فقط — تنفيذ وسيط معطل" : "Paper trading only — broker execution disabled",
  });
}
