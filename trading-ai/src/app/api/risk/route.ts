import { NextResponse } from "next/server";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { assessRisk, getCapitalProtectionRules, validateDailyLoss } from "@/lib/risk/manager";
import { getMockAsset } from "@/lib/data/mock-market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const equity = Number(searchParams.get("equity") ?? 100_000);
  const dailyLoss = Number(searchParams.get("dailyLoss") ?? 0);

  const asset = getMockAsset(symbol);
  const assessment = assessRisk(symbol, asset.price, equity);
  const withinDailyLimit = validateDailyLoss(Math.abs(dailyLoss));

  return NextResponse.json({
    settings: DEFAULT_RISK_SETTINGS,
    rules: getCapitalProtectionRules(),
    assessment,
    dailyLossCheck: { lossPct: dailyLoss, withinLimit: withinDailyLimit },
    compliance: { paperTradingOnly: true, realBrokerExecution: false },
  });
}
