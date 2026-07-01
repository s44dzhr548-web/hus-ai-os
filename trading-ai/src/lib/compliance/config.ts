import type { ComplianceConfig, RiskSettings } from "@/types/trading";

export const COMPLIANCE_CONFIG: ComplianceConfig = {
  paperTradingOnly: true,
  realBrokerExecution: false,
  financialAdviceDisclaimer:
    "This platform provides educational analysis and paper-trading simulation only. Nothing here constitutes financial advice, investment recommendation, or an offer to buy or sell securities.",
  jurisdictionNotice:
    "Users are responsible for compliance with local regulations. Real-money trading requires separate broker authorization and KYC.",
  dataMode: process.env.ALPACA_API_KEY ? "live" : "mock",
};

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  stopLossPct: 2,
  takeProfitPct: 6,
  maxPositionPct: 10,
  dailyLossLimitPct: 3,
  riskPerTradePct: 1,
  maxOpenPositions: 5,
  paperTradingOnly: true,
  realBrokerExecution: false,
};

export function isRealTradingAllowed(): boolean {
  return COMPLIANCE_CONFIG.realBrokerExecution === true && !COMPLIANCE_CONFIG.paperTradingOnly;
}
