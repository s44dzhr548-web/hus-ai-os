import type {
  Recommendation,
  RecommendationExplainability,
  RiskLevel,
  TechnicalAnalysis,
} from "@/types/trading";

export function buildExplainability(
  analysis: {
    symbol: string;
    recommendation: Recommendation;
    confidence: number;
    riskLevel: RiskLevel;
    signalScore: number;
    technical: TechnicalAnalysis;
    newsImpact: { headline: string; sentiment: string }[];
    sectorImpact: { sector: string; summary: string };
    macroFactors: { oilImpact: number; ratesImpact: number; economicEvents: { title: string }[] };
    marketCorrelation: { index: string; correlation: number }[];
  },
  isDemo: boolean,
  provider?: string
): RecommendationExplainability {
  const rec = analysis.recommendation;
  const reviewHours = rec === "buy" ? 24 : rec === "sell" ? 12 : 72;
  const reviewBy = new Date(Date.now() + reviewHours * 3600000).toISOString();

  const newsSent =
    analysis.newsImpact.length > 0
      ? analysis.newsImpact.map((n) => n.headline).slice(0, 2).join("; ")
      : "No major headlines";

  const corr = analysis.marketCorrelation[0];
  const nextEvent = analysis.macroFactors.economicEvents[0]?.title ?? "next macro release";

  return {
    technical: {
      en: `${analysis.technical.trend} trend (strength ${analysis.technical.trendStrength}/100). RSI ${analysis.technical.rsi}, MACD ${analysis.technical.macdSignal}. Support ${analysis.technical.support}, resistance ${analysis.technical.resistance}.`,
      ar: `اتجاه ${analysis.technical.trend === "bullish" ? "صاعد" : analysis.technical.trend === "bearish" ? "هابط" : "محايد"} (قوة ${analysis.technical.trendStrength}/100). RSI ${analysis.technical.rsi}، MACD ${analysis.technical.macdSignal}.`,
    },
    fundamental: {
      en: `Sector ${analysis.sectorImpact.sector} — valuation and earnings context inferred from sector momentum. Signal ${analysis.signalScore}/100 reflects price action vs sector baseline.`,
      ar: `قطاع ${analysis.sectorImpact.sector} — سياق تقييم وأرباح من زخم القطاع. الإشارة ${analysis.signalScore}/100 تعكس السعر مقابل القطاع.`,
    },
    news: {
      en: `News sentiment from ${analysis.newsImpact.length} headlines: ${newsSent}.`,
      ar: `مزاج الأخبار من ${analysis.newsImpact.length} عنوان: ${newsSent}.`,
    },
    sector: {
      en: `${analysis.sectorImpact.sector}: ${analysis.sectorImpact.summary}`,
      ar: `قطاع ${analysis.sectorImpact.sector}: ${analysis.sectorImpact.summary}`,
    },
    macro: {
      en: `Macro backdrop: oil ${(analysis.macroFactors.oilImpact * 100).toFixed(0)}%, rates ${(Math.abs(analysis.macroFactors.ratesImpact) * 100).toFixed(0)}% sensitivity.`,
      ar: `خلفية ماكرو: نفط ${(analysis.macroFactors.oilImpact * 100).toFixed(0)}%، فائدة ${(Math.abs(analysis.macroFactors.ratesImpact) * 100).toFixed(0)}%.`,
    },
    oilImpact: {
      en: `Oil sensitivity ${(analysis.macroFactors.oilImpact * 100).toFixed(0)}% — relevant for energy, transport, Saudi names.`,
      ar: `حساسية النفط ${(analysis.macroFactors.oilImpact * 100).toFixed(0)}% — مهمة للطاقة والنقل والأسهم السعودية.`,
      score: analysis.macroFactors.oilImpact,
    },
    ratesImpact: {
      en: `Rate sensitivity ${(Math.abs(analysis.macroFactors.ratesImpact) * 100).toFixed(0)}% — affects banks, REITs, growth stocks.`,
      ar: `حساسية الفائدة ${(Math.abs(analysis.macroFactors.ratesImpact) * 100).toFixed(0)}% — تؤثر على البنوك والعقار وأسهم النمو.`,
      score: analysis.macroFactors.ratesImpact,
    },
    economicEvent: {
      en: `Next monitor: ${nextEvent}. High-impact events can override technical signals within 48h.`,
      ar: `المراقبة التالية: ${nextEvent}. الأحداث عالية التأثير قد تلغي الإشارات الفنية خلال 48 ساعة.`,
    },
    correlation: {
      en: `Correlation with ${corr?.index ?? "SPY"}: ${((corr?.correlation ?? 0) * 100).toFixed(0)}%.`,
      ar: `ارتباط مع ${corr?.index ?? "SPY"}: ${((corr?.correlation ?? 0) * 100).toFixed(0)}%.`,
    },
    risk: {
      en: `Risk level ${analysis.riskLevel}. Volatility ${(analysis.technical.volatility * 100).toFixed(1)}%. Volume ${analysis.technical.volumeTrend}.`,
      ar: `مستوى المخاطر ${analysis.riskLevel}. التقلب ${(analysis.technical.volatility * 100).toFixed(1)}%.`,
    },
    confidence: {
      en: `Confidence ${(analysis.confidence * 100).toFixed(0)}% based on indicator alignment and data quality${isDemo ? " (demo data reduces certainty)" : ""}.`,
      ar: `الثقة ${(analysis.confidence * 100).toFixed(0)}% بناءً على توافق المؤشرات${isDemo ? " (بيانات تجريبية)" : ""}.`,
    },
    invalidation: {
      en:
        rec === "buy"
          ? `Invalidated if price breaks below support ${analysis.technical.support} or RSI drops under 40 with rising volume.`
          : rec === "sell"
            ? `Invalidated if price reclaims resistance ${analysis.technical.resistance} or positive macro surprise.`
            : `Invalidated if a strong directional breakout occurs above ${analysis.technical.resistance} or below ${analysis.technical.support}.`,
      ar:
        rec === "buy"
          ? `يُلغى إذا كسر السعر الدعم ${analysis.technical.support} أو RSI تحت 40 مع حجم صاعد.`
          : rec === "sell"
            ? `يُلغى إذا استرد المقاومة ${analysis.technical.resistance} أو مفاجأة ماكرو إيجابية.`
            : `يُلغى عند اختراق قوي فوق ${analysis.technical.resistance} أو تحت ${analysis.technical.support}.`,
    },
    monitorNext: {
      en: `Watch ${nextEvent}, volume at ${analysis.technical.resistance}/${analysis.technical.support}, and sector ${analysis.sectorImpact.sector} leadership.`,
      ar: `راقب ${nextEvent}، الحجم عند ${analysis.technical.resistance}/${analysis.technical.support}، وقيادة قطاع ${analysis.sectorImpact.sector}.`,
    },
    reviewBy,
    dataSource: isDemo ? "demo" : "live",
    provider,
  };
}

export function explainabilityToBullets(e: RecommendationExplainability, locale: "ar" | "en"): string[] {
  if (locale === "ar") {
    return [e.technical.ar, e.fundamental.ar, e.news.ar, e.sector.ar, e.macro.ar, e.oilImpact.ar, e.ratesImpact.ar, e.economicEvent.ar, e.correlation.ar, e.risk.ar, e.confidence.ar, e.invalidation.ar, e.monitorNext.ar];
  }
  return [e.technical.en, e.fundamental.en, e.news.en, e.sector.en, e.macro.en, e.oilImpact.en, e.ratesImpact.en, e.economicEvent.en, e.correlation.en, e.risk.en, e.confidence.en, e.invalidation.en, e.monitorNext.en];
}
