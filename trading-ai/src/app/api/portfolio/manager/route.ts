import { NextResponse } from "next/server";
import { getPortfolioManagerState } from "@/lib/portfolio/manager";

export async function GET() {
  return NextResponse.json(await getPortfolioManagerState());
}
