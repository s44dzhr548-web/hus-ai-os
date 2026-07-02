import type {
  CrossMarketChain,
  CrossMarketRelation,
  DataQualityScore,
  MarketHealthDashboard,
  MarketHealthScore,
  OpportunityItem,
  ScenarioResult,
  SmartMoneyFlowMap,
} from "@/types/trading";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { hashSymbol } from "@/lib/data/seed";
import { getMissingApiKeys, getProviderHealth } from "@/lib/market/unified";
import { verifyAllProviders } from "@/lib/market/verify";
import { scanAllSignals } from "@/lib/ai/analysis-engine";

export const CROSS_MARKET_CHAINS: CrossMarketChain[] = [
  {
    id: "oil-chain",
    titleEn: "Oil → Energy → Transport → Airlines → Manufacturing → Retail",
    titleAr: "نفط ← طاقة ← نقل ← طيران ← تصنيع ← تجزئة",
    nodes: [
      { labelEn: "Oil", labelAr: "نفط" },
      { labelEn: "Energy", labelAr: "طاقة" },
      { labelEn: "Transportation", labelAr: "نقل" },
      { labelEn: "Airlines", labelAr: "طيران" },
      { labelEn: "Manufacturing", labelAr: "تصنيع" },
      { labelEn: "Retail", labelAr: "تجزئة" },
    ],
    correlationScore: 0.68,
    impactScore: 0.82,
    expectedDirection: "mixed",
    confidence: 0.74,
  },
  {
    id: "rates-chain",
    titleEn: "Interest Rates → Banks → Real Estate → Growth Stocks",
    titleAr: "فائدة ← بنوك ← عقار ← أسهم نمو",
    nodes: [
      { labelEn: "Interest Rates", labelAr: "أسعار الفائدة" },
      { labelEn: "Banks", labelAr: "بنوك" },
      { labelEn: "Real Estate", labelAr: "عقار" },
      { labelEn: "Growth Stocks", labelAr: "أسهم نمو" },
    ],
    correlationScore: 0.71,
    impactScore: 0.85,
    expectedDirection: "down",
    confidence: 0.78,
  },
  {
    id: "usd-chain",
    titleEn: "USD → Gold → Commodities → Emerging Markets",
    titleAr: "دولار ← ذهب ← سلع ← أسواق ناشئة",
    nodes: [
      { labelEn: "USD", labelAr: "دولار" },
      { labelEn: "Gold", labelAr: "ذهب" },
      { labelEn: "Commodities", labelAr: "سلع" },
      { labelEn: "Emerging Markets", labelAr: "أسواق ناشئة" },
    ],
    correlationScore: -0.62,
    impactScore: 0.76,
    expectedDirection: "mixed",
    confidence: 0.7,
  },
  {
    id: "crypto-chain",
    titleEn: "Crypto → Global Risk Sentiment",
    titleAr: "عملات رقمية ← apetite للمخاطر",
    nodes: [
      { labelEn: "Crypto", labelAr: "عملات رقمية" },
      { labelEn: "Risk Sentiment", labelAr: "معنويات المخاطرة" },
    ],
    correlationScore: 0.55,
    impactScore: 0.69,
    expectedDirection: "up",
    confidence: 0.65,
  },
  {
    id: "saudi-chain",
    titleEn: "Saudi Market → Oil → Petrochemicals → Banks",
    titleAr: "السوق السعودي ← نفط ← بتروكيماويات ← بنوك",
    nodes: [
      { labelEn: "Saudi Market", labelAr: "السوق السعودي" },
      { labelEn: "Oil", labelAr: "نفط" },
      { labelEn: "Petrochemicals", labelAr: "بتروكيماويات" },
      { labelEn: "Banks", labelAr: "بنوك" },
    ],
    correlationScore: 0.72,
    impactScore: 0.88,
    expectedDirection: "up",
    confidence: 0.8,
  },
];

export function getCrossMarketChains() {
  return { chains: CROSS_MARKET_CHAINS, relations: [] as CrossMarketRelation[] };
}

export async function buildMarketHealthDashboard(): Promise<MarketHealthDashboard> {
  const h = (seed: string) => 35 + (hashSymbol(seed) % 55);
  const metrics = [
    { id: "trend", labelEn: "Market Trend", labelAr: "اتجاه السوق", value: h("trend"), status: h("trend") > 55 ? "bullish" as const : h("trend") < 45 ? "bearish" as const : "neutral" as const, detailEn: "Broad index trend strength", detailAr: "قوة اتجاه المؤشرات" },
    { id: "liquidity", labelEn: "Liquidity", labelAr: "السيولة", value: h("liq"), status: "neutral" as const, detailEn: "Bid-ask and volume depth proxy", detailAr: "عمق السيولة والحجم" },
    { id: "feargreed", labelEn: "Fear & Greed", labelAr: "خوف وطمع", value: h("fg"), status: h("fg") > 60 ? "bullish" as const : h("fg") < 40 ? "bearish" as const : "neutral" as const, detailEn: "Composite sentiment index", detailAr: "مؤشر معنويات مركّب" },
    { id: "volatility", labelEn: "Volatility", labelAr: "التقلب", value: h("vol"), status: h("vol") > 65 ? "bearish" as const : "neutral" as const, detailEn: "VIX-like implied stress", detailAr: "ضغط تقلب مشابه VIX" },
    { id: "momentum", labelEn: "Momentum", labelAr: "الزخم", value: h("mom"), status: h("mom") > 55 ? "bullish" as const : "neutral" as const, detailEn: "Cross-asset momentum score", detailAr: "زخم عبر الأصول" },
    { id: "breadth", labelEn: "Breadth", labelAr: "الاتساع", value: h("breadth"), status: "neutral" as const, detailEn: "Advancers vs decliners", detailAr: "الصاعد vs الهابط" },
    { id: "flow", labelEn: "Money Flow", labelAr: "تدفق الأموال", value: h("flow"), status: h("flow") > 50 ? "bullish" as const : "bearish" as const, detailEn: "Net capital flow proxy", detailAr: "تدفق رأس المال" },
    { id: "rotation", labelEn: "Sector Rotation", labelAr: "تناوب القطاعات", value: h("rot"), status: "neutral" as const, detailEn: "Leadership shift detection", detailAr: "اكتشاف تحول القيادة" },
    { id: "institutional", labelEn: "Institutional Activity", labelAr: "نشاط مؤسسي", value: h("inst"), status: "neutral" as const, detailEn: "Block flow & dark pool proxy", detailAr: "تدفقات كتلية" },
  ];

  const avg = Math.round(metrics.reduce((a, m) => a + m.value, 0) / metrics.length);
  const score: MarketHealthScore = {
    score: avg,
    labelEn: avg >= 65 ? "Healthy" : avg >= 45 ? "Mixed" : "Stressed",
    labelAr: avg >= 65 ? "صحي" : avg >= 45 ? "مختلط" : "مضغوط",
    breakdown: metrics.map((m) => ({
      factorEn: m.labelEn,
      factorAr: m.labelAr,
      points: m.value,
      maxPoints: 100,
    })),
  };

  return { metrics, score, updatedAt: new Date().toISOString() };
}

export function buildSmartMoneyFlowMap(): SmartMoneyFlowMap {
  const nodes = [
    { asset: "Stocks", assetAr: "أسهم", flowPct: 12, direction: "in" as const },
    { asset: "Crypto", assetAr: "عملات رقمية", flowPct: -8, direction: "out" as const },
    { asset: "Gold", assetAr: "ذهب", flowPct: 5, direction: "in" as const },
    { asset: "Oil", assetAr: "نفط", flowPct: 3, direction: "in" as const },
    { asset: "Forex", assetAr: "فوركس", flowPct: -2, direction: "neutral" as const },
    { asset: "Bonds", assetAr: "سندات", flowPct: -6, direction: "out" as const },
    { asset: "Cash", assetAr: "نقد", flowPct: -4, direction: "out" as const },
  ];
  return {
    period: "Last 5 sessions",
    nodes,
    summaryEn: "Risk-on rotation: equities and commodities inflow; crypto and bonds outflow.",
    summaryAr: "تناوب risk-on: تدفق للأسهم والسلع؛ خروج من crypto والسندات.",
  };
}

export const SCENARIO_TEMPLATES: ScenarioResult[] = [
  {
    id: "oil-up",
    questionEn: "What if oil rises 10%?",
    questionAr: "ماذا لو ارتفع النفط 10%؟",
    impacts: [
      { marketEn: "Energy stocks", marketAr: "أسهم الطاقة", direction: "up", magnitudePct: 6 },
      { marketEn: "Airlines / Transport", marketAr: "طيران / نقل", direction: "down", magnitudePct: -4 },
      { marketEn: "Saudi market", marketAr: "السوق السعودي", direction: "up", magnitudePct: 3 },
      { marketEn: "Inflation expectations", marketAr: "توقعات التضخم", direction: "up", magnitudePct: 2 },
    ],
    summaryEn: "Net positive for producers, negative for transport margins.",
    summaryAr: "إيجابي للمنتجين، سلبي لهوامش النقل.",
  },
  {
    id: "fed-cut",
    questionEn: "What if the Fed cuts rates?",
    questionAr: "ماذا لو خفض الفيد الفائدة؟",
    impacts: [
      { marketEn: "Banks", marketAr: "بنوك", direction: "mixed", magnitudePct: 1 },
      { marketEn: "Real estate / REITs", marketAr: "عقار / REITs", direction: "up", magnitudePct: 5 },
      { marketEn: "Growth stocks", marketAr: "أسهم نمو", direction: "up", magnitudePct: 7 },
      { marketEn: "USD", marketAr: "دولار", direction: "down", magnitudePct: -2 },
    ],
    summaryEn: "Risk assets rally; rate-sensitive sectors lead.",
    summaryAr: "ارتفاع أصول المخاطرة؛ القطاعات الحساسة للفائدة تقود.",
  },
  {
    id: "inflation-up",
    questionEn: "What if inflation increases?",
    questionAr: "ماذا لو ارتفع التضخم؟",
    impacts: [
      { marketEn: "Bonds", marketAr: "سندات", direction: "down", magnitudePct: -5 },
      { marketEn: "Commodities", marketAr: "سلع", direction: "up", magnitudePct: 4 },
      { marketEn: "Consumer discretionary", marketAr: "استهلاكية", direction: "down", magnitudePct: -3 },
    ],
    summaryEn: "Stagflation risk — real assets outperform duration.",
    summaryAr: "خطر stagflation — الأصول الحقيقية تتفوق.",
  },
  {
    id: "earnings-miss",
    questionEn: "What if earnings miss?",
    questionAr: "ماذا لو خيبت الأرباح؟",
    impacts: [
      { marketEn: "Affected stock", marketAr: "السهم المتأثر", direction: "down", magnitudePct: -8 },
      { marketEn: "Sector peers", marketAr: "أقران القطاع", direction: "down", magnitudePct: -2 },
      { marketEn: "Index", marketAr: "المؤشر", direction: "down", magnitudePct: -1 },
    ],
    summaryEn: "Single-name shock with sector spillover.",
    summaryAr: "صدمة فردية مع امتداد قطاعي.",
  },
];

export async function discoverOpportunities(limit = 8): Promise<OpportunityItem[]> {
  const symbols = DEFAULT_WATCHLIST.slice(0, 12);
  const signals = await scanAllSignals(symbols);
  const types: OpportunityItem["type"][] = ["momentum", "volume", "rotation", "undervalued", "hidden"];

  return signals
    .map((s, i) => ({
      symbol: s.symbol,
      name: s.symbol,
      assetClass: s.symbol.startsWith("22") ? "saudi" as const : s.symbol.includes("USD") ? "crypto" as const : "stock" as const,
      type: types[i % types.length],
      score: s.score,
      reasonEn:
        s.recommendation === "buy"
          ? `AI momentum ${s.score}/100 · confidence ${(s.confidence * 100).toFixed(0)}%`
          : `Unusual setup detected · score ${s.score}/100`,
      reasonAr:
        s.recommendation === "buy"
          ? `زخم AI ${s.score}/100 · ثقة ${(s.confidence * 100).toFixed(0)}%`
          : `إعداد غير عادي · درجة ${s.score}/100`,
    }))
    .filter((o) => o.score >= 55 || o.type === "hidden")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function computeDataQualityScore(): Promise<DataQualityScore> {
  const verification = await verifyAllProviders();
  const providers = getProviderHealth();
  const missing = getMissingApiKeys();
  const liveCount = providers.filter((p) => p.status === "live" || p.status === "ready").length;
  const apiHealthPct = Number(((liveCount / providers.length) * 100).toFixed(0));
  const freshnessPts = verification.demoMarkets.length === 0 ? 30 : verification.demoMarkets.length < 3 ? 20 : 10;
  const providerPts = Math.min(30, liveCount * 3);
  const keyPts = Math.max(0, 20 - missing.length * 2);
  const verifyPts = verification.connectedProviders.length > 5 ? 20 : 10;
  const score = Math.min(100, freshnessPts + providerPts + keyPts + verifyPts);

  return {
    score,
    freshnessEn: verification.demoMarkets.length === 0 ? "All probed markets live" : `${verification.demoMarkets.length} markets on demo fallback`,
    freshnessAr: verification.demoMarkets.length === 0 ? "جميع الأسواق المفحوصة حية" : `${verification.demoMarkets.length} أسواق على بديل تجريبي`,
    missingProviders: missing,
    delayedData: verification.demoMarkets.length > 0,
    confidenceEn: score >= 75 ? "High confidence in data" : score >= 50 ? "Moderate — some demo fallback" : "Low — add API keys",
    confidenceAr: score >= 75 ? "ثقة عالية في البيانات" : score >= 50 ? "متوسطة — بعض البديل التجريبي" : "منخفضة — أضف مفاتيح API",
    apiHealthPct,
    breakdown: [
      { factorEn: "Data freshness", factorAr: "حداثة البيانات", points: freshnessPts, maxPoints: 30 },
      { factorEn: "Provider coverage", factorAr: "تغطية المزودين", points: providerPts, maxPoints: 30 },
      { factorEn: "API keys configured", factorAr: "مفاتيح API", points: keyPts, maxPoints: 20 },
      { factorEn: "Verification health", factorAr: "صحة التحقق", points: verifyPts, maxPoints: 20 },
    ],
  };
}
