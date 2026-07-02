import type { ExplainabilityContributions, Recommendation, RiskLevel, TechnicalAnalysis } from "@/types/trading";

export function buildContributions(
  analysis: {
    recommendation: Recommendation;
    confidence: number;
    riskLevel: RiskLevel;
    signalScore: number;
    technical: TechnicalAnalysis;
    newsCount: number;
    oilImpact: number;
    ratesImpact: number;
    sectorImpact: number;
  }
): ExplainabilityContributions {
  const techBase = analysis.technical.trendStrength * 0.35 + (analysis.signalScore - 50) * 0.4;
  const newsBase = Math.min(25, analysis.newsCount * 5 + 5);
  const macroBase = (Math.abs(analysis.oilImpact) + Math.abs(analysis.ratesImpact)) * 40;
  const sectorBase = Math.abs(analysis.sectorImpact) * 25 + 10;
  const riskBase =
    analysis.riskLevel === "critical" ? 28 : analysis.riskLevel === "high" ? 22 : analysis.riskLevel === "medium" ? 14 : 8;

  const raw = {
    technical: Math.max(5, techBase),
    news: newsBase,
    macro: macroBase,
    sector: sectorBase,
    risk: riskBase,
  };
  const total = raw.technical + raw.news + raw.macro + raw.sector + raw.risk;
  const pct = (v: number) => Math.round((v / total) * 100);

  const reviewHours = analysis.recommendation === "buy" ? 24 : analysis.recommendation === "sell" ? 12 : 72;

  return {
    technicalPct: pct(raw.technical),
    newsPct: pct(raw.news),
    macroPct: pct(raw.macro),
    sectorPct: pct(raw.sector),
    riskPct: pct(raw.risk),
    whyNowEn: `Signal ${analysis.signalScore}/100 with ${analysis.technical.trend} trend and confidence ${(analysis.confidence * 100).toFixed(0)}%.`,
    whyNowAr: `إشارة ${analysis.signalScore}/100 مع اتجاه ${analysis.technical.trend} وثقة ${(analysis.confidence * 100).toFixed(0)}%.`,
    invalidationEn: `Invalidate if price breaks support ${analysis.technical.support} or RSI diverges from ${analysis.recommendation} bias.`,
    invalidationAr: `تُلغى إذا كُسر الدعم ${analysis.technical.support} أو RSI يخالف اتجاه ${analysis.recommendation}.`,
    nextReviewAt: new Date(Date.now() + reviewHours * 3600000).toISOString(),
  };
}
