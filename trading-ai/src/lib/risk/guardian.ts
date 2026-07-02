import type { AssetClass, PaperPortfolio, RiskGuardianState, RiskSettings } from "@/types/trading";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { assetClassForSymbol } from "@/lib/market/catalog";
import { assessRisk, validateDailyLoss } from "@/lib/risk/manager";

let emergencyStop = false;

const ALLOWED_MARKETS: AssetClass[] = ["stock", "crypto", "forex", "saudi", "commodity", "index", "etf"];

export function setEmergencyStop(active: boolean) {
  emergencyStop = active;
}

export function isEmergencyStopActive() {
  return emergencyStop;
}

export function getGuardianState(
  portfolio: PaperPortfolio,
  settings: RiskSettings = DEFAULT_RISK_SETTINGS
): RiskGuardianState {
  const dailyLossPct = portfolio.totalPnlPct < 0 ? Math.abs(portfolio.totalPnlPct) : 0;
  const dailyLossBreached = !validateDailyLoss(dailyLossPct, settings);
  const blockedReasons: string[] = [];

  if (emergencyStop) blockedReasons.push("Emergency stop active");
  if (dailyLossBreached) blockedReasons.push(`Daily loss limit ${settings.dailyLossLimitPct}% breached`);
  if (portfolio.openPositions.length >= settings.maxOpenPositions) {
    blockedReasons.push(`Max open positions (${settings.maxOpenPositions}) reached`);
  }
  if (settings.realBrokerExecution) blockedReasons.push("Real broker execution blocked by compliance");

  return {
    emergencyStop,
    dailyLossBreached,
    allowedMarkets: ALLOWED_MARKETS,
    maxRiskPerTradePct: settings.riskPerTradePct,
    dailyLossLimitPct: settings.dailyLossLimitPct,
    blockedReasons,
    canTrade: blockedReasons.length === 0,
  };
}

export function validatePaperTrade(
  symbol: string,
  side: "buy" | "sell",
  quantity: number,
  portfolio: PaperPortfolio,
  entryPrice: number,
  settings: RiskSettings = DEFAULT_RISK_SETTINGS
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const guardian = getGuardianState(portfolio, settings);

  if (!guardian.canTrade) reasons.push(...guardian.blockedReasons);

  const assetClass = assetClassForSymbol(symbol);
  if (!ALLOWED_MARKETS.includes(assetClass)) {
    reasons.push(`Market ${assetClass} not in allowed list`);
  }

  if (side === "buy") {
    const assessment = assessRisk(symbol, entryPrice, portfolio.equity, settings);
    if (!assessment.withinLimits) reasons.push(...assessment.violations);
    const maxCost = portfolio.equity * (settings.maxPositionPct / 100);
    const orderCost = entryPrice * quantity;
    if (orderCost > maxCost * 1.05) {
      reasons.push(`Order cost exceeds max position allocation (${maxCost.toFixed(0)})`);
    } else if (assessment.positionSize > 0 && quantity > assessment.positionSize * 1.5) {
      reasons.push(`Quantity exceeds max position size (${assessment.positionSize})`);
    }
  }

  return { allowed: reasons.length === 0, reasons };
}
