import type { GlobalMarketBrain } from "@/types/trading";
import { getCrossMarketChains } from "@/lib/intelligence/market-intelligence";

export async function getGlobalMarketBrain(): Promise<GlobalMarketBrain> {
  const { chains } = getCrossMarketChains();

  return {
    regions: [
      { id: "saudi", nameEn: "Saudi Arabia", nameAr: "السعودية", health: 68, trend: "hold" },
      { id: "us", nameEn: "United States", nameAr: "الولايات المتحدة", health: 72, trend: "buy" },
      { id: "crypto", nameEn: "Crypto", nameAr: "العملات الرقمية", health: 55, trend: "hold" },
      { id: "forex", nameEn: "Forex", nameAr: "الفوركس", health: 61, trend: "hold" },
      { id: "commodities", nameEn: "Commodities", nameAr: "السلع", health: 64, trend: "buy" },
      { id: "indices", nameEn: "Global Indices", nameAr: "المؤشرات العالمية", health: 70, trend: "buy" },
    ],
    crossMarketInsights: chains.slice(0, 6).map((c, i) => ({
      id: c.id,
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      markets: c.nodes.map((n) => n.labelEn),
      drivers: ["oil", "rates", "usd"].slice(0, 2 + (i % 2)),
      impactEn: `Cross-market chain with correlation ${(c.correlationScore * 100).toFixed(0)}% — ${c.expectedDirection} bias`,
      impactAr: `سلسلة أسواق بارتباط ${(c.correlationScore * 100).toFixed(0)}% — اتجاه ${c.expectedDirection}`,
      correlationScore: c.correlationScore,
      severity: c.impactScore > 0.7 ? "high" : c.impactScore > 0.4 ? "medium" : "low",
    })),
    macroDrivers: {
      oil: {
        value: "Brent ~$82",
        impactEn: "Higher oil supports Saudi energy and weighs on import-heavy sectors globally",
        impactAr: "ارتفاع النفط يدعم الطاقة السعودية ويضغط على قطاعات الاستيراد عالمياً",
      },
      rates: {
        value: "Fed hold / regional cuts mixed",
        impactEn: "Rate path drives USD, growth stocks, and real estate sensitivity",
        impactAr: "مسار الفائدة يحرك الدولار والأسهم النمو والعقارات",
      },
      usd: {
        value: "DXY firm",
        impactEn: "Strong USD pressures EM currencies and commodity importers",
        impactAr: "دولار قوي يضغط على عملات الأسواق الناشئة والمستوردين",
      },
      gold: {
        value: "Gold defensive bid",
        impactEn: "Safe-haven flows rise on geopolitical and rate uncertainty",
        impactAr: "تدفقات الملاذ الآمن ترتفع مع عدم اليقين الجيوسياسي والفائدة",
      },
      cryptoSentiment: {
        value: "Neutral-risk-on",
        impactEn: "BTC correlation with tech risk appetite remains elevated",
        impactAr: "ارتباط BTC بشهية المخاطر التقنية لا يزال مرتفعاً",
      },
      saudiSector: {
        value: "Energy & banks lead",
        impactEn: "Tadawul leadership tied to oil, dividends, and Vision 2030 flows",
        impactAr: "قيادة تداول مرتبطة بالنفط والتوزيعات وتدفقات رؤية 2030",
      },
    },
    updatedAt: new Date().toISOString(),
  };
}
