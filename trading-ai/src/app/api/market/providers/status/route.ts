import { NextResponse } from "next/server";
import { getProviderHealth, getMissingApiKeys, isRealMarketDataMode } from "@/lib/market/unified";
import { getDataMode } from "@/lib/market/config";
import { cacheStats } from "@/lib/market/cache";
import { getBrokerAdapter } from "@/lib/data/adapters";
import { verifyAllProviders } from "@/lib/market/verify";

export async function GET() {
  const providers = getProviderHealth();
  const verification = await verifyAllProviders();
  return NextResponse.json({
    realMarketDataMode: isRealMarketDataMode(),
    dataMode: getDataMode(),
    runtimeMode: verification.dataMode,
    missingApiKeys: getMissingApiKeys(),
    connectedProviders: verification.connectedProviders,
    liveMarkets: verification.liveMarkets,
    demoMarkets: verification.demoMarkets,
    demoFallbackActive: verification.demoMarkets.length > 0,
    cache: cacheStats(),
    providers,
    verification: verification.providers,
    broker: getBrokerAdapter(),
    brokerExecution: "DISABLED",
    paperTradingOnly: true,
    verifiedAt: verification.verifiedAt,
  });
}
