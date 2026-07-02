import type { EventImpactItem } from "@/types/trading";

export const EVENT_IMPACT_MAP: EventImpactItem[] = [
  {
    id: "oil",
    driverEn: "Oil price shock",
    driverAr: "صدمة أسعار النفط",
    impacts: [
      { targetEn: "Energy sector", targetAr: "قطاع الطاقة", direction: "up", score: 0.82 },
      { targetEn: "Transportation / Airlines", targetAr: "النقل / الطيران", direction: "down", score: 0.75 },
      { targetEn: "Saudi market (2222, TASI)", targetAr: "السوق السعودي", direction: "up", score: 0.78 },
      { targetEn: "Petrochemicals", targetAr: "بتروكيماويات", direction: "up", score: 0.7 },
    ],
    summaryEn: "Oil up → producers gain, transport margins compress, Saudi/heavyweights benefit.",
    summaryAr: "نفط ↑ → المنتجون يربحون، النقل يضغط، السعودي يستفيد.",
  },
  {
    id: "rates",
    driverEn: "Interest rate change",
    driverAr: "تغيير أسعار الفائدة",
    impacts: [
      { targetEn: "Banks", targetAr: "البنوك", direction: "mixed", score: 0.65 },
      { targetEn: "Real estate / REITs", targetAr: "العقار / REITs", direction: "down", score: 0.8 },
      { targetEn: "Growth stocks", targetAr: "أسهم النمو", direction: "down", score: 0.72 },
      { targetEn: "USD / Forex", targetAr: "الدولار / فوركس", direction: "up", score: 0.6 },
    ],
    summaryEn: "Higher rates hurt duration assets; banks may benefit from NIM expansion.",
    summaryAr: "فائدة أعلى تضر الأصول طويلة الأجل؛ البنوك قد تستفيد.",
  },
  {
    id: "usd",
    driverEn: "USD strength",
    driverAr: "قوة الدولار",
    impacts: [
      { targetEn: "Gold", targetAr: "الذهب", direction: "down", score: 0.74 },
      { targetEn: "Commodities", targetAr: "السلع", direction: "down", score: 0.68 },
      { targetEn: "Emerging markets", targetAr: "الأسواق الناشئة", direction: "down", score: 0.71 },
      { targetEn: "US multinationals", targetAr: "شركات أمريكية متعددة", direction: "mixed", score: 0.5 },
    ],
    summaryEn: "Strong USD pressures gold, commodities, and EM flows.",
    summaryAr: "دولار قوي يضغط الذهب والسلع والأسواق الناشئة.",
  },
  {
    id: "gold",
    driverEn: "Gold rally",
    driverAr: "ارتفاع الذهب",
    impacts: [
      { targetEn: "Safe-haven sentiment", targetAr: "الملاذ الآمن", direction: "up", score: 0.7 },
      { targetEn: "Crypto (inverse risk-on)", targetAr: "العملات الرقمية", direction: "mixed", score: 0.45 },
      { targetEn: "Mining equities", targetAr: "أسهم التعدين", direction: "up", score: 0.65 },
    ],
    summaryEn: "Gold strength often signals risk-off or inflation hedging.",
    summaryAr: "قوة الذهب تشير غالباً لrisk-off أو تحوط تضخمي.",
  },
  {
    id: "crypto-sentiment",
    driverEn: "Crypto risk sentiment",
    driverAr: "معنويات مخاطر العملات الرقمية",
    impacts: [
      { targetEn: "High-beta tech", targetAr: "تقنية عالية المخاطر", direction: "up", score: 0.62 },
      { targetEn: "Global risk appetite", targetAr: "apetite للمخاطر", direction: "up", score: 0.58 },
      { targetEn: "Defensive sectors", targetAr: "قطاعات دفاعية", direction: "down", score: 0.4 },
    ],
    summaryEn: "Crypto often leads risk-on/risk-off cycles for growth assets.",
    summaryAr: "Crypto تقود غالباً دورات risk-on/risk-off.",
  },
  {
    id: "saudi",
    driverEn: "Saudi market drivers",
    driverAr: "محركات السوق السعودي",
    impacts: [
      { targetEn: "Aramco (2222)", targetAr: "أرامكو (2222)", direction: "up", score: 0.85 },
      { targetEn: "SABIC / petrochemicals", targetAr: "سابك / بتروكيماويات", direction: "up", score: 0.72 },
      { targetEn: "Saudi banks", targetAr: "البنوك السعودية", direction: "mixed", score: 0.55 },
      { targetEn: "Sector chain: oil → energy → banks", targetAr: "سلسلة: نفط → طاقة → بنوك", direction: "up", score: 0.68 },
    ],
    summaryEn: "Tadawul tied to Brent, OPEC+, and domestic liquidity cycles.",
    summaryAr: "تداول مرتبط ببرنت وOPEC+ والسيولة المحلية.",
  },
];

export function getEventImpactMap() {
  return { events: EVENT_IMPACT_MAP, updatedAt: new Date().toISOString() };
}
