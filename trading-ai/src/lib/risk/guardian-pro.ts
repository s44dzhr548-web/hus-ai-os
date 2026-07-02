import type { GuardianProResult, PaperPortfolio, RiskSettings } from "@/types/trading";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getGuardianState, validatePaperTrade } from "@/lib/risk/guardian";
import { assetClassForSymbol } from "@/lib/market/catalog";
import { hashSymbol } from "@/lib/data/seed";

export function runGuardianProAssessment(
  symbol: string,
  side: "buy" | "sell",
  quantity: number,
  portfolio: PaperPortfolio,
  price: number,
  settings: RiskSettings = DEFAULT_RISK_SETTINGS
): GuardianProResult {
  const base = validatePaperTrade(symbol, side, quantity, portfolio, price, settings);
  const guardian = getGuardianState(portfolio, settings);
  const volPct = 15 + (hashSymbol(symbol + "vol") % 25);
  const corrRisk = portfolio.openPositions.some((p) => assetClassForSymbol(p.symbol) === assetClassForSymbol(symbol));
  const exposurePct =
    portfolio.equity > 0
      ? (portfolio.openPositions.reduce((s, p) => s + p.quantity * p.currentPrice, 0) / portfolio.equity) * 100
      : 0;
  const liquidityLow = ["2222", "GLD"].includes(symbol) ? false : hashSymbol(symbol) % 7 === 0;
  const newsShock = hashSymbol(symbol + "news") % 11 === 0;

  const checks: GuardianProResult["checks"] = [
    {
      id: "volatility",
      labelEn: "Volatility",
      labelAr: "التقلب",
      passed: volPct < 35,
      severity: volPct > 30 ? "high" : "medium",
      detailEn: `Implied vol ~${volPct}%`,
      detailAr: `تقلب ضمني ~${volPct}%`,
    },
    {
      id: "correlation",
      labelEn: "Correlation risk",
      labelAr: "مخاطر الارتباط",
      passed: !corrRisk || side === "sell",
      severity: corrRisk ? "medium" : "low",
      detailEn: corrRisk ? "Same asset class already held" : "No duplicate class risk",
      detailAr: corrRisk ? "نفس فئة الأصول موجودة" : "لا تكرار فئة",
    },
    {
      id: "exposure",
      labelEn: "Portfolio exposure",
      labelAr: "تعرض المحفظة",
      passed: exposurePct < 85,
      severity: exposurePct > 75 ? "high" : "low",
      detailEn: `Invested ${exposurePct.toFixed(0)}% of equity`,
      detailAr: `مستثمر ${exposurePct.toFixed(0)}% من رأس المال`,
    },
    {
      id: "liquidity",
      labelEn: "Liquidity",
      labelAr: "السيولة",
      passed: !liquidityLow,
      severity: liquidityLow ? "medium" : "low",
      detailEn: liquidityLow ? "Thin volume detected" : "Liquidity acceptable for paper sim",
      detailAr: liquidityLow ? "حجم رقيق" : "سيولة مقبولة للمحاكاة",
    },
    {
      id: "news_shock",
      labelEn: "News shock",
      labelAr: "صدمة أخبار",
      passed: !newsShock,
      severity: newsShock ? "high" : "low",
      detailEn: newsShock ? "Recent headline volatility spike" : "No shock flag",
      detailAr: newsShock ? "تقلب أخبار حديث" : "لا صدمة",
    },
    {
      id: "guardian_base",
      labelEn: "Core guardian",
      labelAr: "الحارس الأساسي",
      passed: base.allowed,
      severity: guardian.emergencyStop ? "critical" : "medium",
      detailEn: base.allowed ? "Passed base checks" : base.reasons.join("; "),
      detailAr: base.allowed ? "اجتاز الفحوص" : base.reasons.join("؛ "),
    },
  ];

  const failed = checks.filter((c) => !c.passed);
  const allowed = failed.length === 0;
  const suggestedPositionSizePct = Math.max(
    2,
    settings.maxPositionPct - failed.length * 2 - (volPct > 30 ? 3 : 0)
  );

  return {
    allowed,
    checks,
    suggestedPositionSizePct,
    summaryEn: allowed
      ? `Paper trade allowed. Suggested size ${suggestedPositionSizePct}% of equity.`
      : `Blocked: ${failed.map((f) => f.labelEn).join(", ")}. Reduce size or wait.`,
    summaryAr: allowed
      ? `مسموح. حجم مقترح ${suggestedPositionSizePct}% من رأس المال.`
      : `محظور: ${failed.map((f) => f.labelAr).join("، ")}.`,
  };
}
