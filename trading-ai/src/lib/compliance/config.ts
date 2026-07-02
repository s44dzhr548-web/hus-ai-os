import type { ComplianceConfig, RiskSettings } from "@/types/trading";
import { getDataMode, isRealMarketDataMode } from "@/lib/market/config";

export const COMPLIANCE_CONFIG: ComplianceConfig = {
  paperTradingOnly: true,
  realBrokerExecution: false,
  complianceModeLocked: true,
  financialAdviceDisclaimer:
    "This platform provides educational analysis and paper-trading simulation only. Nothing here constitutes financial advice, investment recommendation, or an offer to buy or sell securities.",
  financialAdviceDisclaimerAr:
    "هذه المنصة للتحليل التعليمي ومحاكاة التداول الورقي فقط. لا تُعد نصيحة مالية أو توصية استثمارية أو عرضاً لبيع أو شراء أوراق مالية.",
  jurisdictionNotice:
    "Users are responsible for compliance with local regulations. Real-money trading requires separate broker authorization and KYC.",
  jurisdictionNoticeAr:
    "المستخدم مسؤول عن الامتثال للأنظمة المحلية. التداول بأموال حقيقية يتطلب ترخيص وسيط وKYC منفصل.",
  dataMode: isRealMarketDataMode() ? getDataMode() : "mock",
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
  if (COMPLIANCE_CONFIG.complianceModeLocked) return false;
  return COMPLIANCE_CONFIG.realBrokerExecution === true && !COMPLIANCE_CONFIG.paperTradingOnly;
}
