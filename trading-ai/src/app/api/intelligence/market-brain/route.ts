import { NextResponse } from "next/server";
import { getGlobalMarketBrain } from "@/lib/intelligence/market-brain";

export async function GET() {
  return NextResponse.json(await getGlobalMarketBrain());
}
