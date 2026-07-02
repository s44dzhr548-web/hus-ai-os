import { NextResponse } from "next/server";
import {
  buildMarketHealthDashboard,
  buildSmartMoneyFlowMap,
  computeDataQualityScore,
  discoverOpportunities,
  SCENARIO_TEMPLATES,
} from "@/lib/intelligence/market-intelligence";
import { runStrategyLab } from "@/lib/intelligence/strategy-lab";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";

  if (type === "market-health") {
    return NextResponse.json(await buildMarketHealthDashboard());
  }
  if (type === "smart-money") {
    return NextResponse.json(buildSmartMoneyFlowMap());
  }
  if (type === "scenarios") {
    return NextResponse.json({ scenarios: SCENARIO_TEMPLATES });
  }
  if (type === "opportunities") {
    return NextResponse.json({ opportunities: await discoverOpportunities() });
  }
  if (type === "data-quality") {
    return NextResponse.json(await computeDataQualityScore());
  }
  if (type === "strategy-lab") {
    const symbol = searchParams.get("symbol")?.toUpperCase() ?? "AAPL";
    return NextResponse.json(await runStrategyLab(symbol));
  }

  const [marketHealth, dataQuality, opportunities] = await Promise.all([
    buildMarketHealthDashboard(),
    computeDataQualityScore(),
    discoverOpportunities(6),
  ]);

  return NextResponse.json({
    marketHealth,
    smartMoney: buildSmartMoneyFlowMap(),
    scenarios: SCENARIO_TEMPLATES,
    opportunities,
    dataQuality,
  });
}
