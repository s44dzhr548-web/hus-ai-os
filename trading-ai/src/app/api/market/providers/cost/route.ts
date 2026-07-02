import { NextResponse } from "next/server";
import { getCostDashboard } from "@/lib/market/provider-manager/cost";
import { getProviderCostTable } from "@/lib/market/provider-costs-data";

export async function GET() {
  return NextResponse.json({
    dashboard: getCostDashboard(),
    providers: getProviderCostTable(),
    paperTradingOnly: true,
  });
}
