import { NextResponse } from "next/server";
import { getPaperPortfolio, placePaperOrder, resetPaperPortfolio } from "@/lib/paper/portfolio";
import { isRealTradingAllowed } from "@/lib/compliance/config";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { validatePaperTrade } from "@/lib/risk/guardian";
import { unifiedQuote } from "@/lib/market/unified";

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

  const portfolio = await getPaperPortfolio();
  const quote = await unifiedQuote(symbol);
  const check = validatePaperTrade(symbol, side, quantity, portfolio, quote.data.price, DEFAULT_RISK_SETTINGS);
  if (!check.allowed) {
    return NextResponse.json({ ok: false, error: check.reasons.join("; "), guardianBlocked: true, portfolio }, { status: 403 });
  }

  const result = await placePaperOrder(symbol, side, quantity);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
