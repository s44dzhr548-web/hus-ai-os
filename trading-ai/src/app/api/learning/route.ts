import { NextResponse } from "next/server";
import { getAllRecords, getLearningStats, resolvePendingRecords } from "@/lib/learning/tracker";

export async function GET() {
  await resolvePendingRecords();
  return NextResponse.json({
    stats: getLearningStats(),
    records: getAllRecords(),
  });
}
