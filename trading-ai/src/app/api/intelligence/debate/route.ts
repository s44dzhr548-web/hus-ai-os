import { NextResponse } from "next/server";
import { runAIDebate } from "@/lib/intelligence/ai-debate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() ?? "AAPL";
  const lang = searchParams.get("lang") === "en" ? "en" : "ar";
  return NextResponse.json(await runAIDebate(symbol, lang));
}
