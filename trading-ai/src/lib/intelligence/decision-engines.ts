import type {
  MarketConsensus,
  Recommendation,
  RecommendationTransition,
  RiskLevel,
  TechnicalAnalysis,
  WhatMustChangeRule,
  WhyNowEngine,
} from "@/types/trading";
import { hashSymbol } from "@/lib/data/seed";

type Ctx = {
  symbol: string;
  recommendation: Recommendation;
  confidence: number;
  signalScore: number;
  technical: TechnicalAnalysis;
  newsSentiment: number;
  sectorStrength: number;
  oilImpact: number;
  ratesImpact: number;
  nextEvent?: string;
};

export function buildWhyNow(ctx: Ctx): WhyNowEngine {
  const { technical, recommendation, signalScore, newsSentiment } = ctx;
  const volShift = technical.volumeTrend === "rising" ? "volume expansion" : "stable volume";
  const macdFresh = technical.macdSignal === "positive" ? "MACD turned positive recently" : technical.macdSignal === "negative" ? "MACD turned negative recently" : "MACD neutral";

  const whyNowEn =
    recommendation === "buy"
      ? `Signal crossed actionable threshold (${signalScore}/100) with ${technical.trend} trend and ${volShift}. ${macdFresh} aligns now — waiting risks missing entry near support ${technical.support}.`
      : recommendation === "sell"
        ? `Risk/reward skewed negative: RSI ${technical.rsi}, trend ${technical.trend}, ${volShift}. ${macdFresh} — acting now limits downside before support breaks.`
        : `No clear edge yet (${signalScore}/100). Mixed signals — trend ${technical.trend}, RSI ${technical.rsi}. Better to wait for confirmation at ${technical.resistance} or ${technical.support}.`;

  const whyNowAr =
    recommendation === "buy"
      ? `الإشارة تجاوزت عتبة التنفيذ (${signalScore}/100) مع اتجاه ${technical.trend === "bullish" ? "صاعد" : technical.trend === "bearish" ? "هابط" : "محايد"} و${technical.volumeTrend === "rising" ? "حجم متزايد" : "حجم مستقر"}. ${macdFresh} — التأخير قد يفوت فرصة قرب الدعم ${technical.support}.`
      : recommendation === "sell"
        ? `المخاطرة/العائد سلبية: RSI ${technical.rsi}، اتجاه ${technical.trend}. التصرف الآن يحد من الهبوط قبل كسر الدعم.`
        : `لا أفضلية واضحة (${signalScore}/100). إشارات مختلطة — انتظر تأكيداً عند ${technical.resistance} أو ${technical.support}.`;

  const whyNotYesterdayEn = `Yesterday lacked today's confluence: trend strength was ~${Math.max(technical.trendStrength - 8, 20)}/100 vs ${technical.trendStrength}/100 now. ${newsSentiment !== 0 ? "News sentiment shifted since prior session." : "No fresh catalyst yesterday."}`;
  const whyNotYesterdayAr = `أمس lacked توافق اليوم: قوة الاتجاه ~${Math.max(technical.trendStrength - 8, 20)}/100 مقابل ${technical.trendStrength}/100 الآن.`;

  const whyNotTomorrowEn = `Tomorrow may reprice on ${ctx.nextEvent ?? "upcoming macro or earnings"}. If price holds ${technical.support}–${technical.resistance}, thesis holds; gap risk favors acting on confirmed signals today.`;
  const whyNotTomorrowAr = `غداً قد يُعاد التسعير على ${ctx.nextEvent ?? "حدث ماكرو أو أرباح"}. إذا ثبت السعر بين ${technical.support}–${technical.resistance}، الفرضية صالحة.`;

  const whatChangedEn = `${macdFresh}. Volume ${technical.volumeTrend}. News sentiment ${newsSentiment > 0 ? "improved" : newsSentiment < 0 ? "deteriorated" : "unchanged"}. Signal score moved to ${signalScore}/100.`;
  const whatChangedAr = `تغير MACD/الحجم. مزاج الأخبار ${newsSentiment > 0 ? "تحسّن" : newsSentiment < 0 ? "تدهور" : "بدون تغيير"}. درجة الإشارة ${signalScore}/100.`;

  return {
    whyNow: { en: whyNowEn, ar: whyNowAr },
    whyNotYesterday: { en: whyNotYesterdayEn, ar: whyNotYesterdayAr },
    whyNotTomorrow: { en: whyNotTomorrowEn, ar: whyNotTomorrowAr },
    whatChanged: { en: whatChangedEn, ar: whatChangedAr },
  };
}

export function buildWhatMustChange(ctx: Ctx): WhatMustChangeRule[] {
  const { technical, recommendation } = ctx;
  const buyPrice = Number((technical.resistance * 0.998).toFixed(2));
  const sellPrice = Number((technical.support * 1.002).toFixed(2));

  const rules: WhatMustChangeRule[] = [
    {
      id: "price-breakout",
      conditionEn: `If price reaches $${buyPrice} (near resistance)`,
      conditionAr: `إذا وصل السعر $${buyPrice} (قرب المقاومة)`,
      newRecommendation: recommendation === "hold" ? "buy" : "buy",
      triggerEn: "Breakout with volume confirms upward momentum",
      triggerAr: "اختراق مع حجم يؤكد زخماً صاعداً",
    },
    {
      id: "volume-drop",
      conditionEn: "If volume drops while price stalls",
      conditionAr: "إذا انخفض الحجم مع تجمّد السعر",
      newRecommendation: "hold",
      triggerEn: "Conviction fades — downgrade to wait mode",
      triggerAr: "ضعف قناعة — انتظر",
    },
    {
      id: "support-break",
      conditionEn: `If price breaks below $${technical.support}`,
      conditionAr: `إذا كسر السعر $${technical.support}`,
      newRecommendation: "sell",
      triggerEn: "Technical invalidation — risk-off",
      triggerAr: "إلغاء فني — تجنب المخاطرة",
    },
    {
      id: "earnings-miss",
      conditionEn: "If earnings or guidance disappoint vs consensus",
      conditionAr: "إذا خيبت الأرباح أو التوجيهات التوقعات",
      newRecommendation: "sell",
      triggerEn: "Fundamental downgrade overrides technical hold",
      triggerAr: "تدهور أساسي يلغي الاحتفاظ الفني",
    },
    {
      id: "rate-surprise",
      conditionEn: "If central bank surprises hawkish/dovish vs expectations",
      conditionAr: "إذا فاجأ البنك المركزي بتوقعات الفائدة",
      newRecommendation: ctx.ratesImpact < -0.2 ? "sell" : "hold",
      triggerEn: "Macro shock reprices rate-sensitive names",
      triggerAr: "صدمة ماكرو تعيد تسعير الأسماء الحساسة للفائدة",
    },
  ];

  if (recommendation === "buy") {
    rules.unshift({
      id: "pullback-hold",
      conditionEn: `If price pulls back to $${sellPrice} without volume spike`,
      conditionAr: `إذا تراجع السعر إلى $${sellPrice} بدون حجم قوي`,
      newRecommendation: "hold",
      triggerEn: "Healthy pullback — reassess before adding",
      triggerAr: "تراجع صحي — أعد التقييم قبل الإضافة",
    });
  }

  return rules.slice(0, 6);
}

export function buildRecommendationTransitions(current: Recommendation, ctx: Ctx): RecommendationTransition[] {
  const { technical } = ctx;
  const transitions: RecommendationTransition[] = [];

  if (current === "buy") {
    transitions.push({
      from: "buy",
      to: "hold",
      conditionEn: `Price stalls below $${technical.resistance} with falling volume`,
      conditionAr: `السعر يتوقف تحت $${technical.resistance} مع حجم هابط`,
      triggerEn: "Momentum fades — downgrade to wait",
      triggerAr: "زخم يضعف — انتقل للانتظار",
    });
    transitions.push({
      from: "buy",
      to: "sell",
      conditionEn: `Break below support $${technical.support}`,
      conditionAr: `كسر الدعم $${technical.support}`,
      triggerEn: "Thesis invalidated — exit",
      triggerAr: "الفرضية أُلغيت — اخرج",
    });
  }

  if (current === "hold") {
    transitions.push({
      from: "hold",
      to: "sell",
      conditionEn: "Negative news cluster or macro surprise",
      conditionAr: "مجموعة أخبار سلبية أو مفاجأة ماكرو",
      triggerEn: "Risk-off catalyst",
      triggerAr: "محفّز risk-off",
    });
    transitions.push({
      from: "hold",
      to: "buy",
      conditionEn: `Breakout above $${technical.resistance} with volume`,
      conditionAr: `اختراق فوق $${technical.resistance} مع حجم`,
      triggerEn: "Confirmation of upward edge",
      triggerAr: "تأكيد أفضلية صاعدة",
    });
  }

  if (current === "sell") {
    transitions.push({
      from: "sell",
      to: "hold",
      conditionEn: "Oversold bounce without trend reversal",
      conditionAr: "ارتداد oversold بدون انعكاس اتجاه",
      triggerEn: "Cover shorts / wait for clarity",
      triggerAr: "غطّ مراكز / انتظر وضوحاً",
    });
    transitions.push({
      from: "sell",
      to: "buy",
      conditionEn: `Reclaim resistance $${technical.resistance} + positive catalyst`,
      conditionAr: `استرداد $${technical.resistance} + محفّز إيجابي`,
      triggerEn: "Trend reversal confirmed",
      triggerAr: "انعكاس اتجاه مؤكد",
    });
  }

  return transitions;
}

export function buildMarketConsensus(ctx: Ctx & { riskLevel: RiskLevel; aiScore: number }): MarketConsensus {
  const sources = [
    { id: "technical", labelEn: "Technical Analysis", labelAr: "التحليل الفني", score: ctx.technical.trendStrength, direction: scoreToRec(ctx.technical.trendStrength), weight: 0.2 },
    { id: "fundamental", labelEn: "Fundamental Analysis", labelAr: "التحليل الأساسي", score: 45 + (hashSymbol(ctx.symbol + "fund") % 35), direction: scoreToRec(45 + (hashSymbol(ctx.symbol + "fund") % 35)), weight: 0.12 },
    { id: "news", labelEn: "News", labelAr: "الأخبار", score: 50 + ctx.newsSentiment * 25, direction: (ctx.newsSentiment > 0.2 ? "buy" : ctx.newsSentiment < -0.2 ? "sell" : "hold") as Recommendation, weight: 0.14 },
    { id: "economic", labelEn: "Economic Events", labelAr: "الأحداث الاقتصادية", score: 50 + ctx.ratesImpact * -100, direction: (ctx.ratesImpact < -0.2 ? "sell" : "hold") as Recommendation, weight: 0.1 },
    { id: "sector", labelEn: "Sector Strength", labelAr: "قوة القطاع", score: ctx.sectorStrength, direction: scoreToRec(ctx.sectorStrength), weight: 0.12 },
    { id: "sentiment", labelEn: "Market Sentiment", labelAr: "معنويات السوق", score: 40 + (hashSymbol(ctx.symbol + "sent") % 45), direction: scoreToRec(40 + (hashSymbol(ctx.symbol + "sent") % 45)), weight: 0.1 },
    { id: "ai", labelEn: "AI Models", labelAr: "نماذج AI", score: ctx.aiScore, direction: ctx.recommendation, weight: 0.14 },
    { id: "flow", labelEn: "Institutional Flow", labelAr: "تدفقات مؤسسية", score: 48 + (hashSymbol(ctx.symbol + "flow") % 30), direction: scoreToRec(48 + (hashSymbol(ctx.symbol + "flow") % 30)), weight: 0.08 },
  ];

  const buyVotes = sources.filter((s) => s.direction === "buy").reduce((a, s) => a + s.weight, 0);
  const sellVotes = sources.filter((s) => s.direction === "sell").reduce((a, s) => a + s.weight, 0);
  const holdVotes = sources.filter((s) => s.direction === "hold").reduce((a, s) => a + s.weight, 0);
  const maxVote = Math.max(buyVotes, sellVotes, holdVotes);
  const consensusPct = Number((maxVote * 100).toFixed(0));

  const dominant = buyVotes === maxVote ? "buy" : sellVotes === maxVote ? "sell" : "hold";
  const summaryEn = `${consensusPct}% agreement toward ${dominant.toUpperCase()} across ${sources.length} intelligence sources. AI + technical ${ctx.recommendation === dominant ? "align" : "partially diverge"}.`;
  const summaryAr = `${consensusPct}% اتفاق على ${dominant === "buy" ? "شراء" : dominant === "sell" ? "بيع" : "احتفاظ"} عبر ${sources.length} مصادر.`;

  return { consensusPct, sources, summaryEn, summaryAr };
}

function scoreToRec(score: number): Recommendation {
  if (score >= 65) return "buy";
  if (score <= 35) return "sell";
  return "hold";
}
