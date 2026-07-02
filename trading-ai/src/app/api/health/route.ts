import { NextResponse } from "next/server";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { getDataMode } from "@/lib/market/config";
import { COMPLIANCE_CONFIG } from "@/lib/compliance/config";

export async function GET() {
  const portfolio = await getPaperPortfolio();
  return NextResponse.json({
    status: "ok",
    service: "trading-ai",
    mode: getDataMode(),
    paperTradingOnly: COMPLIANCE_CONFIG.paperTradingOnly,
    brokerExecution: "DISABLED",
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
      "/api/competitors",
      "/api/paper",
      "/api/audit",
    ],
    timestamp: new Date().toISOString(),
  });
}
