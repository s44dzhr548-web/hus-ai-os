import { NextResponse } from "next/server";
import { unifiedQuote } from "@/lib/market/unified";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? searchParams.get("symbol") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (!symbols.length) {
    return NextResponse.json({ error: "symbols required (comma-separated)" }, { status: 400 });
  }
  const quotes = await Promise.all(symbols.map((s) => unifiedQuote(s)));
  const demoCount = quotes.filter((q) => q.isDemoData).length;
  return NextResponse.json({
    count: quotes.length,
    demoCount,
    liveCount: quotes.length - demoCount,
    isDemoData: demoCount === quotes.length,
    quotes,
  });
}
