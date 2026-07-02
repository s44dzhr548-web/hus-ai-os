import { NextResponse } from "next/server";
import { executeGuardedPaperOrder } from "@/lib/paper/guarded-order";
import { isRealTradingAllowed } from "@/lib/compliance/config";

export async function POST(request: Request) {
  if (isRealTradingAllowed()) {
    return NextResponse.json({ error: "Real execution blocked — paper trading only" }, { status: 403 });
  }
  const body = (await request.json()) as { symbol?: string; side?: "buy" | "sell"; quantity?: number };
  const symbol = body.symbol?.toUpperCase();
  const side = body.side;
  const quantity = Number(body.quantity ?? 0);
  if (!symbol || !side || !quantity) {
    return NextResponse.json({ error: "symbol, side, quantity required" }, { status: 400 });
  }
  const result = await executeGuardedPaperOrder(symbol, side, quantity);
  return NextResponse.json({ ...result, executionMode: "paper_only", brokerEnabled: false }, { status: result.ok ? 200 : result.guardianBlocked ? 403 : 400 });
}
