import { NextResponse } from "next/server";
import { buildSmartMoneySnapshot, getSmartMoneyOpportunitiesByCategory } from "@/lib/intelligence/smart-money-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "best_inflow";
  const limit = Math.min(20, Number(searchParams.get("limit") ?? 10));
  const snapshot = await buildSmartMoneySnapshot();
  const items = getSmartMoneyOpportunitiesByCategory(category, snapshot).slice(0, limit);

  return NextResponse.json({
    category,
    total: items.length,
    opportunities: items,
    scoreWeights: {
      moneyFlow: 0.25,
      technical: 0.2,
      fundamentals: 0.2,
      newsSentiment: 0.15,
      macro: 0.1,
      risk: 0.1,
    },
    executionMode: "paper_only",
    brokerEnabled: false,
    updatedAt: snapshot.updatedAt,
  });
}
