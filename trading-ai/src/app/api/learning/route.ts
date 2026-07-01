import { NextResponse } from "next/server";
import { getAllRecords, getLearningStats } from "@/lib/learning/tracker";

export async function GET() {
  return NextResponse.json({
    stats: getLearningStats(),
    records: getAllRecords(),
  });
}
