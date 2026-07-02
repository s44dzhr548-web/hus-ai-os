import { NextResponse } from "next/server";
import { getProviderHealth, getMissingApiKeys, isRealMarketDataMode } from "@/lib/market/unified";
import { getDataMode } from "@/lib/market/config";
import { enterpriseCacheStats } from "@/lib/market/cache-enterprise";
import { getBrokerAdapter } from "@/lib/data/adapters";
import { verifyAllProviders } from "@/lib/market/verify";
import { getEnterpriseProviderDashboard } from "@/lib/market/provider-manager/manager";
import { getCostDashboard } from "@/lib/market/provider-manager/cost";
import { getEnterpriseLogStats } from "@/lib/market/provider-manager/logging";
import { isAutomaticSwitchingEnabled } from "@/lib/market/provider-manager/config-store";

export async function GET() {
  const providers = getProviderHealth();
  const verification = await verifyAllProviders();
  const manager = await getEnterpriseProviderDashboard();
  const cost = getCostDashboard();
  return NextResponse.json({
    realMarketDataMode: isRealMarketDataMode(),
    dataMode: getDataMode(),
    runtimeMode: verification.dataMode,
    missingApiKeys: getMissingApiKeys(),
    connectedProviders: verification.connectedProviders,
    liveMarkets: verification.liveMarkets,
    demoMarkets: verification.demoMarkets,
    demoFallbackActive: verification.demoMarkets.length > 0,
    cache: enterpriseCacheStats(),
    providers,
    verification: verification.providers,
    broker: getBrokerAdapter(),
    brokerExecution: "DISABLED",
    paperTradingOnly: true,
    verifiedAt: verification.verifiedAt,
    manager,
    cost,
    logStats: getEnterpriseLogStats(),
    automaticFailover: isAutomaticSwitchingEnabled(),
  });
}
