import { NextResponse } from "next/server";
import { runAIAnalysis, scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { recordPrediction } from "@/lib/learning/tracker";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const scan = searchParams.get("scan");
  const lang = searchParams.get("lang") === "en" ? "en" : "ar";

  if (scan === "1") {
    const symbols = (searchParams.get("symbols") ?? DEFAULT_WATCHLIST.join(","))
      .split(",")
      .map((s) => s.trim().toUpperCase());
    return NextResponse.json({ signals: scanAllSignals(symbols), mode: "mock" });
  }

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const analysis = runAIAnalysis(symbol, lang);
  recordPrediction(
    symbol,
    analysis.recommendation,
    analysis.confidence,
    analysis.recommendation === "buy" ? "up" : analysis.recommendation === "sell" ? "down" : "flat"
  );

  return NextResponse.json({ analysis, mode: "mock" });
}
