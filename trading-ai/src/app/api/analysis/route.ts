import { NextResponse } from "next/server";
import { runAIAnalysis, scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { getDataMode } from "@/lib/market/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const scan = searchParams.get("scan");
  const lang = searchParams.get("lang") === "en" ? "en" : "ar";

  if (scan === "1") {
    const symbols = (searchParams.get("symbols") ?? DEFAULT_WATCHLIST.join(","))
      .split(",")
      .map((s) => s.trim().toUpperCase());
    const signals = await scanAllSignals(symbols);
    return NextResponse.json({ signals, mode: getDataMode() });
  }

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const analysis = await runAIAnalysis(symbol, lang);
  return NextResponse.json({ analysis, mode: getDataMode() });
}
