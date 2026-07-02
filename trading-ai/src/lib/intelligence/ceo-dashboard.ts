import type { CEODashboardData } from "@/types/trading";
import { getBotStatus } from "@/lib/bot/auto-paper-bot";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { discoverOpportunities, buildMarketHealthDashboard } from "@/lib/intelligence/market-intelligence";
import { simulatePortfolioFollowingAI } from "@/lib/learning/memory";
import { getAlerts } from "@/lib/learning/tracker";
import { COMPLIANCE_CONFIG } from "@/lib/compliance/config";
import { getMissingApiKeys } from "@/lib/market/unified";
import { scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { getLearningStats } from "@/lib/learning/memory";

export async function buildCEODashboard(): Promise<CEODashboardData> {
  const [botStatus, portfolio, opportunities, marketHealth, simulation, signals, stats] = await Promise.all([
    getBotStatus(),
    getPaperPortfolio(),
    discoverOpportunities(5),
    buildMarketHealthDashboard(),
    simulatePortfolioFollowingAI(),
    scanAllSignals(DEFAULT_WATCHLIST.slice(0, 6)),
    Promise.resolve(getLearningStats()),
  ]);

  const missing = getMissingApiKeys();
  const alerts = getAlerts().slice(0, 8);

  const topRisks = [
    {
      titleEn: "Concentration risk",
      titleAr: "مخاطر التركيز",
      severity: portfolio.openPositions.length > 4 ? ("high" as const) : ("medium" as const),
      detailEn: `${portfolio.openPositions.length} open paper positions`,
      detailAr: `${portfolio.openPositions.length} مراكز ورقية مفتوحة`,
    },
    {
      titleEn: "Daily loss proximity",
      titleAr: "قرب حد الخسارة اليومية",
      severity: portfolio.totalPnlPct < -2 ? ("high" as const) : ("low" as const),
      detailEn: `P/L ${portfolio.totalPnlPct.toFixed(1)}%`,
      detailAr: `الربح/الخسارة ${portfolio.totalPnlPct.toFixed(1)}%`,
    },
    ...(botStatus.emergencyStop
      ? [
          {
            titleEn: "Emergency stop active",
            titleAr: "إيقاف طوارئ نشط",
            severity: "critical" as const,
            detailEn: "Bot trading halted",
            detailAr: "تداول البوت متوقف",
          },
        ]
      : []),
  ];

  return {
    topOpportunities: opportunities,
    topRisks,
    botStatus,
    paperPerformance: {
      totalPnlPct: portfolio.totalPnlPct,
      todayPnlPct: botStatus.todayPnlPct,
      winRate: stats.accuracy,
      trades: portfolio.orders.filter((o) => o.status === "filled").length,
    },
    marketHealth,
    providerStatus: {
      live: missing.length === 0 ? 6 : 6 - missing.length,
      demo: missing.length,
      pendingKeys: missing,
    },
    portfolioSimulation: simulation,
    topRecommendations: signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map((s) => ({ symbol: s.symbol, recommendation: s.recommendation, confidence: s.confidence })),
    alerts,
    compliance: COMPLIANCE_CONFIG,
    generatedAt: new Date().toISOString(),
  };
}
