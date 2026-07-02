import { NextResponse } from "next/server";
import { buildSmartMoneySnapshot, getSmartMoneyOpportunitiesByCategory } from "@/lib/intelligence/smart-money-engine";
import { OPPORTUNITY_SCORE_WEIGHTS, filterPremiumGrades } from "@/lib/intelligence/opportunity-score";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "best_inflow";
  const limit = Math.min(20, Number(searchParams.get("limit") ?? 10));
  const grades = searchParams.get("grades") ?? "premium";
  const snapshot = await buildSmartMoneySnapshot();
  let items = getSmartMoneyOpportunitiesByCategory(category, snapshot);
  if (grades !== "all") {
    items = filterPremiumGrades(items);
  }
  items = items.slice(0, limit);

  return NextResponse.json({
    category,
    grades,
    total: items.length,
    opportunities: items,
    scoreWeights: OPPORTUNITY_SCORE_WEIGHTS,
    gradeScale: {
      "A+": "90–100",
      A: "80–89",
      B: "70–79",
      C: "60–69",
      Avoid: "below 60",
    },
    executionMode: "paper_only",
    brokerEnabled: false,
    updatedAt: snapshot.updatedAt,
  });
}
