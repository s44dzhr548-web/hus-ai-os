import { NextResponse } from "next/server";
import {
  getAllRecords,
  getConfidenceAnalytics,
  getLearningStats,
  resolvePendingRecords,
  simulatePortfolioFollowingAI,
} from "@/lib/learning/tracker";

export async function GET() {
  await resolvePendingRecords();
  return NextResponse.json({
    stats: getLearningStats(),
    records: getAllRecords(),
    confidence: getConfidenceAnalytics(),
    simulation: await simulatePortfolioFollowingAI(),
  });
}
