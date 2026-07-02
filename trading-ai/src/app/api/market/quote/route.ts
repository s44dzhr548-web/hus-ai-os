import { NextResponse } from "next/server";
import { unifiedQuote } from "@/lib/market/unified";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const result = await unifiedQuote(symbol);
  return NextResponse.json(result);
}
