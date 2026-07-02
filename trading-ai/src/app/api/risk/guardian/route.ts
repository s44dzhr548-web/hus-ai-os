import { NextResponse } from "next/server";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getGuardianState, setEmergencyStop, validatePaperTrade } from "@/lib/risk/guardian";

export async function GET() {
  const portfolio = await getPaperPortfolio();
  return NextResponse.json({ guardian: getGuardianState(portfolio, DEFAULT_RISK_SETTINGS), portfolio });
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
    const check = validatePaperTrade(
      String(body.symbol).toUpperCase(),
      body.side === "sell" ? "sell" : "buy",
      Number(body.quantity ?? 1),
      portfolio,
      Number(body.price ?? 100),
      DEFAULT_RISK_SETTINGS
    );
    return NextResponse.json(check);
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
