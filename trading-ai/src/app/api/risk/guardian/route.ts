import { NextResponse } from "next/server";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getGuardianState, setEmergencyStop, validatePaperTrade } from "@/lib/risk/guardian";
import { runGuardianProAssessment } from "@/lib/risk/guardian-pro";

export async function GET() {
  const portfolio = await getPaperPortfolio();
  return NextResponse.json({ guardian: getGuardianState(portfolio, DEFAULT_RISK_SETTINGS), portfolio, pro: true });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "emergency_stop") {
    setEmergencyStop(Boolean(body.active));
    const portfolio = await getPaperPortfolio();
    return NextResponse.json({ guardian: getGuardianState(portfolio, DEFAULT_RISK_SETTINGS) });
  }
  if (body.action === "validate" && body.symbol) {
    const portfolio = await getPaperPortfolio();
    const symbol = String(body.symbol).toUpperCase();
    const side = body.side === "sell" ? "sell" : "buy";
    const quantity = Number(body.quantity ?? 1);
    const price = Number(body.price ?? 100);
    const check = validatePaperTrade(symbol, side, quantity, portfolio, price, DEFAULT_RISK_SETTINGS);
    const pro = runGuardianProAssessment(symbol, side, quantity, portfolio, price, DEFAULT_RISK_SETTINGS);
    return NextResponse.json({ ...check, pro });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
