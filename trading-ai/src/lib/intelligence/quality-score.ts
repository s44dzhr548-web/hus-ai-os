import type { ExtendedMarketDataResult } from "@/lib/market/provider-manager/manager";
import type { NormalizedQuote } from "@/lib/market/types";

export interface AIQualityScore {
  confidence: number;
  providerCount: number;
  newsScore: number;
  technicalScore: number;
  fundamentalScore: number;
  macroScore: number;
  liquidityScore: number;
  riskScore: number;
  dataStatus: string;
  validationWarning?: string;
  summaryEn: string;
  summaryAr: string;
}

export function buildAIQualityScore(opts: {
  confidence: number;
  signalScore: number;
  newsSentiment: number;
  sectorImpact: number;
  oilImpact: number;
  ratesImpact: number;
  riskLevel: string;
  volatility: number;
  quoteResult: ExtendedMarketDataResult<NormalizedQuote> | { providerCount?: number; aiConfidenceAdjustment?: number; dataStatus?: string; validationWarning?: string; isDemoData: boolean };
}): AIQualityScore {
  const providerCount = "providerCount" in opts.quoteResult ? (opts.quoteResult.providerCount ?? 1) : 1;
  const adj = "aiConfidenceAdjustment" in opts.quoteResult ? (opts.quoteResult.aiConfidenceAdjustment ?? 0) : 0;
  const confidence = Math.max(0.1, Math.min(0.98, opts.confidence + adj));

  const technicalScore = Math.round(opts.signalScore);
  const newsScore = Math.round(50 + opts.newsSentiment * 25);
  const fundamentalScore = Math.round(45 + opts.sectorImpact * 30);
  const macroScore = Math.round(50 + opts.oilImpact * 20 - Math.abs(opts.ratesImpact) * 15);
  const liquidityScore = Math.round(Math.max(20, 100 - opts.volatility * 120));
  const riskScore =
    opts.riskLevel === "critical" ? 90 : opts.riskLevel === "high" ? 75 : opts.riskLevel === "medium" ? 50 : 25;

  const dataStatus = "dataStatus" in opts.quoteResult ? String(opts.quoteResult.dataStatus ?? "estimated") : opts.quoteResult.isDemoData ? "demo" : "live";

  return {
    confidence,
    providerCount,
    newsScore,
    technicalScore,
    fundamentalScore,
    macroScore,
    liquidityScore,
    riskScore,
    dataStatus,
    validationWarning: "validationWarning" in opts.quoteResult ? opts.quoteResult.validationWarning : undefined,
    summaryEn: `Quality from ${providerCount} provider(s) · ${dataStatus} data · confidence ${(confidence * 100).toFixed(0)}%`,
    summaryAr: `جودة من ${providerCount} مزود · بيانات ${dataStatus} · ثقة ${(confidence * 100).toFixed(0)}%`,
  };
}
