import { NextResponse } from "next/server";
import { getProviderHealth } from "@/lib/market/unified";
import { getDataMode, isAnyLiveKeyPresent } from "@/lib/market/config";
import { cacheStats } from "@/lib/market/cache";
import { getBrokerAdapter } from "@/lib/data/adapters";

export async function GET() {
  const providers = getProviderHealth();
  return NextResponse.json({
    dataMode: getDataMode(),
    hasAnyLiveKey: isAnyLiveKeyPresent(),
    demoFallbackActive: !isAnyLiveKeyPresent(),
    cache: cacheStats(),
    providers,
    broker: getBrokerAdapter(),
    brokerExecution: "DISABLED",
  });
}
