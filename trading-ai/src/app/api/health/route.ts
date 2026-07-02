import { NextResponse } from "next/server";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { getDataMode, isRealMarketDataMode } from "@/lib/market/config";
import { COMPLIANCE_CONFIG } from "@/lib/compliance/config";
import { verifyAllProviders } from "@/lib/market/verify";

export async function GET() {
  const portfolio = await getPaperPortfolio();
  const verification = await verifyAllProviders();
  return NextResponse.json({
    status: "ok",
    service: "trading-ai",
    mode: getDataMode(),
    realMarketDataMode: isRealMarketDataMode(),
    paperTradingOnly: COMPLIANCE_CONFIG.paperTradingOnly,
    brokerExecution: "DISABLED",
    connectedProviders: verification.connectedProviders,
    liveMarkets: verification.liveMarkets.length,
    demoMarkets: verification.demoMarkets.length,
    paperAccount: { cash: portfolio.cash, equity: portfolio.equity },
    endpoints: [
      "/api/market",
      "/api/market/search",
      "/api/market/quotes",
      "/api/market/quote",
      "/api/market/candles",
      "/api/market/news",
      "/api/market/economic-calendar",
      "/api/market/status",
      "/api/market/providers/status",
      "/api/market/providers/verify",
      "/api/competitors",
      "/api/paper",
      "/api/audit",
    ],
    timestamp: new Date().toISOString(),
  });
}
