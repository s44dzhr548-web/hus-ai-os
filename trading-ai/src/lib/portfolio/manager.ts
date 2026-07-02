import type { PortfolioManagerState, RiskLevel } from "@/types/trading";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { assetClassForSymbol } from "@/lib/market/catalog";

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  TSLA: "Consumer",
  "2222": "Energy",
  BTC: "Crypto",
  EURUSD: "Forex",
  GLD: "Commodity",
  SPY: "Index ETF",
};

function riskBand(weight: number): RiskLevel {
  if (weight > 25) return "high";
  if (weight > 15) return "medium";
  return "low";
}

export async function getPortfolioManagerState(): Promise<PortfolioManagerState> {
  const portfolio = await getPaperPortfolio();
  const equity = portfolio.equity || portfolio.initialCash;
  const symbols = portfolio.openPositions.length
    ? portfolio.openPositions.map((p) => p.symbol)
    : DEFAULT_WATCHLIST.slice(0, 6);

  const weights = symbols.map((symbol) => {
    const pos = portfolio.openPositions.find((p) => p.symbol === symbol);
    const value = pos ? pos.quantity * pos.currentPrice : equity / symbols.length * 0.1;
    const currentWeightPct = equity > 0 ? (value / equity) * 100 : 0;
    const targetWeightPct = Math.min(20, Math.max(5, 100 / symbols.length));
    return {
      symbol,
      name: symbol,
      assetClass: assetClassForSymbol(symbol),
      targetWeightPct,
      currentWeightPct: Math.round(currentWeightPct * 10) / 10,
      sector: SECTOR_MAP[symbol] ?? "Diversified",
      riskBand: riskBand(currentWeightPct),
    };
  });

  const sectorMap = new Map<string, number>();
  for (const w of weights) {
    sectorMap.set(w.sector, (sectorMap.get(w.sector) ?? 0) + w.currentWeightPct);
  }
  const sectorExposure = [...sectorMap.entries()].map(([sector, pct]) => ({
    sector,
    pct: Math.round(pct * 10) / 10,
  }));

  const maxSector = Math.max(...sectorExposure.map((s) => s.pct), 0);
  const concentrationRisk: RiskLevel = maxSector > 40 ? "high" : maxSector > 25 ? "medium" : "low";

  const rebalanceActions = weights
    .filter((w) => Math.abs(w.currentWeightPct - w.targetWeightPct) > 3)
    .map((w) => ({
      symbol: w.symbol,
      actionEn:
        w.currentWeightPct > w.targetWeightPct
          ? `Reduce exposure by ${(w.currentWeightPct - w.targetWeightPct).toFixed(1)}%`
          : `Increase allocation by ${(w.targetWeightPct - w.currentWeightPct).toFixed(1)}%`,
      actionAr:
        w.currentWeightPct > w.targetWeightPct
          ? `خفض التعرض ${(w.currentWeightPct - w.targetWeightPct).toFixed(1)}%`
          : `زيادة التخصيص ${(w.targetWeightPct - w.currentWeightPct).toFixed(1)}%`,
    }));

  const drawdownPct = portfolio.totalPnlPct < 0 ? Math.abs(portfolio.totalPnlPct) : 0;
  const cashPct = equity > 0 ? (portfolio.cash / equity) * 100 : 100;

  return {
    totalEquity: equity,
    cashPct: Math.round(cashPct * 10) / 10,
    allocations: weights,
    sectorExposure,
    drawdownPct: Math.round(drawdownPct * 10) / 10,
    totalPnlPct: portfolio.totalPnlPct,
    concentrationRisk,
    rebalanceActions,
    updatedAt: new Date().toISOString(),
  };
}
