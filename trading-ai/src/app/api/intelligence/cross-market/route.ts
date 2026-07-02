import { NextResponse } from "next/server";
import { getCrossMarketIntelligence } from "@/lib/intelligence/cross-market";

export async function GET() {
  return NextResponse.json(getCrossMarketIntelligence());
}
