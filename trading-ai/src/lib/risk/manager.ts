import type { RiskAssessment, RiskSettings } from "@/types/trading";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";

export function assessRisk(
  symbol: string,
  entryPrice: number,
  accountEquity: number,
  settings: RiskSettings = DEFAULT_RISK_SETTINGS
): RiskAssessment {
  const positionValue = accountEquity * (settings.maxPositionPct / 100);
  const positionSize = Math.floor(positionValue / entryPrice);
  const stopLoss = Number((entryPrice * (1 - settings.stopLossPct / 100)).toFixed(4));
  const takeProfit = Number((entryPrice * (1 + settings.takeProfitPct / 100)).toFixed(4));
  const riskAmount = Number((positionSize * (entryPrice - stopLoss)).toFixed(2));
  const rewardAmount = Number((positionSize * (takeProfit - entryPrice)).toFixed(2));
  const violations: string[] = [];

  if (riskAmount > accountEquity * (settings.riskPerTradePct / 100)) {
    violations.push(`Risk $${riskAmount} exceeds ${settings.riskPerTradePct}% per-trade limit`);
  }
  if (positionValue > accountEquity * (settings.maxPositionPct / 100) * 1.01) {
    violations.push(`Position size exceeds ${settings.maxPositionPct}% max allocation`);
  }
  if (settings.realBrokerExecution) {
    violations.push("Real broker execution is disabled in compliance mode");
  }

  return {
    symbol,
    positionSize,
    stopLoss,
    takeProfit,
    riskAmount,
    rewardAmount,
    withinLimits: violations.length === 0,
    violations,
  };
}

export function validateDailyLoss(currentLossPct: number, settings: RiskSettings = DEFAULT_RISK_SETTINGS): boolean {
  return currentLossPct <= settings.dailyLossLimitPct;
}

export function getCapitalProtectionRules(settings: RiskSettings = DEFAULT_RISK_SETTINGS) {
  return [
    { rule: "Stop Loss", value: `${settings.stopLossPct}%`, description: "Auto-exit when loss exceeds threshold" },
    { rule: "Take Profit", value: `${settings.takeProfitPct}%`, description: "Lock gains at target level" },
    { rule: "Max Position", value: `${settings.maxPositionPct}%`, description: "Cap per-symbol allocation" },
    { rule: "Daily Loss Limit", value: `${settings.dailyLossLimitPct}%`, description: "Halt trading for the day" },
    { rule: "Risk Per Trade", value: `${settings.riskPerTradePct}%`, description: "Maximum capital at risk per trade" },
    { rule: "Max Open Positions", value: String(settings.maxOpenPositions), description: "Diversification cap" },
    { rule: "Paper Trading Only", value: settings.paperTradingOnly ? "ON" : "OFF", description: "No real money execution" },
    { rule: "Real Broker", value: settings.realBrokerExecution ? "ENABLED" : "DISABLED", description: "Broker API execution gate" },
  ];
}
