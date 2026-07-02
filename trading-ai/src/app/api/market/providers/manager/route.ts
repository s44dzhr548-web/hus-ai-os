import { NextResponse } from "next/server";
import { getEnterpriseProviderDashboard } from "@/lib/market/provider-manager/manager";
import { getCostDashboard } from "@/lib/market/provider-manager/cost";
import { getEnterpriseLogStats } from "@/lib/market/provider-manager/logging";
import { getActivePriorityStrategy } from "@/lib/market/provider-manager/priority";
import { isAutomaticSwitchingEnabled } from "@/lib/market/provider-manager/config-store";

export async function GET() {
  const [dashboard, cost, logStats] = await Promise.all([
    Promise.resolve(getEnterpriseProviderDashboard()),
    Promise.resolve(getCostDashboard()),
    Promise.resolve(getEnterpriseLogStats()),
  ]);

  return NextResponse.json({
    ...dashboard,
    cost,
    logStats,
    priorityStrategy: getActivePriorityStrategy(),
    automaticFailover: isAutomaticSwitchingEnabled(),
    paperTradingOnly: true,
    brokerExecution: "DISABLED",
  });
}
