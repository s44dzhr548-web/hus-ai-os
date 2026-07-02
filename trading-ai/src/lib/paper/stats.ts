import type { PaperPortfolio, RiskLevel } from "@/types/trading";
import { getPaperPortfolio } from "./portfolio";

export type PaperPortfolioStats = {
  totalPnl: number;
  totalPnlPct: number;
  roiPct: number;
  winRate: number;
  drawdownPct: number;
  riskScore: number;
  riskLevel: RiskLevel;
  closedTrades: number;
  openPositions: number;
  totalOrders: number;
};

export async function getPaperPortfolioStats(): Promise<PaperPortfolioStats> {
  const portfolio = await getPaperPortfolio();
  return computePaperStats(portfolio);
}

export function computePaperStats(portfolio: PaperPortfolio): PaperPortfolioStats {
  const closed = portfolio.closedPositions;
  const winning = closed.filter((p) => (p.unrealizedPnl ?? 0) > 0);
  const winRate = closed.length ? Number(((winning.length / closed.length) * 100).toFixed(1)) : 0;
  const drawdownPct = portfolio.totalPnlPct < 0 ? Math.abs(portfolio.totalPnlPct) : 0;
  const roiPct = portfolio.totalPnlPct;
  const riskScore = Math.min(
    100,
    Math.round(drawdownPct * 8 + portfolio.openPositions.length * 6 + (100 - winRate) * 0.2)
  );
  const riskLevel: RiskLevel =
    riskScore > 75 ? "critical" : riskScore > 55 ? "high" : riskScore > 35 ? "medium" : "low";

  return {
    totalPnl: portfolio.totalPnl,
    totalPnlPct: portfolio.totalPnlPct,
    roiPct,
    winRate,
    drawdownPct: Math.round(drawdownPct * 10) / 10,
    riskScore,
    riskLevel,
    closedTrades: closed.length,
    openPositions: portfolio.openPositions.length,
    totalOrders: portfolio.orders.length,
  };
}
