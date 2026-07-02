import { NextResponse } from "next/server";
import { simulatePortfolioFollowingAI } from "@/lib/learning/tracker";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const capital = Number(searchParams.get("capital") ?? 100_000);
  const simulation = await simulatePortfolioFollowingAI(capital > 0 ? capital : 100_000);
  return NextResponse.json({ simulation });
}
