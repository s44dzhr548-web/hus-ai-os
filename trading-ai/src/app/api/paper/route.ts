import { NextResponse } from "next/server";
import { getPaperPortfolio, resetPaperPortfolio } from "@/lib/paper/portfolio";
import { executeGuardedPaperOrder } from "@/lib/paper/guarded-order";
import { isRealTradingAllowed } from "@/lib/compliance/config";

export async function GET() {
  const portfolio = await getPaperPortfolio();
  return NextResponse.json({
    portfolio,
    executionMode: "paper_only",
    realTradingAllowed: isRealTradingAllowed(),
  });
}

export async function POST(request: Request) {
  if (isRealTradingAllowed()) {
    return NextResponse.json({ error: "Real execution blocked" }, { status: 403 });
  }
  const body = (await request.json()) as {
    action?: "order" | "reset";
    symbol?: string;
    side?: "buy" | "sell";
    quantity?: number;
  };

  if (body.action === "reset") {
    resetPaperPortfolio();
    return NextResponse.json({ ok: true, portfolio: await getPaperPortfolio() });
  }

  const symbol = body.symbol?.toUpperCase();
  const side = body.side;
  const quantity = Number(body.quantity ?? 0);
  if (!symbol || !side || !quantity) {
    return NextResponse.json({ error: "symbol, side, quantity required" }, { status: 400 });
  }

  const result = await executeGuardedPaperOrder(symbol, side, quantity);
  return NextResponse.json(result, { status: result.ok ? 200 : result.guardianBlocked ? 403 : 400 });
}
