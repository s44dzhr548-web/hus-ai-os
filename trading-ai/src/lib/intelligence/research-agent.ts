import type { ResearchNewsItem } from "@/types/trading";
import { isNewsConfigured } from "@/lib/market/providers/news";

const DEMO_NEWS: ResearchNewsItem[] = [
  {
    id: "rn-1",
    headlineEn: "Fed signals data-dependent pause on rate cuts",
    headlineAr: "الفيدرالي يشير إلى توقف مرتبط بالبيانات لخفض الفائدة",
    summaryEn: "Markets pricing fewer cuts; USD firm, growth vs value rotation.",
    summaryAr: "الأسواق تسعّر خفضاً أقل؛ دولار قوي وتدوير نمو مقابل قيمة.",
    affectedAssets: ["SPY", "EURUSD", "GLD", "2222"],
    expectedImpactEn: "Moderate headwind for high-duration equities; support for USD and energy exporters.",
    expectedImpactAr: "رياح معاكسة معتدلة للأسهم طويلة المدة؛ دعم للدولار ومصدري الطاقة.",
    sentiment: "neutral",
    publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    dataSource: "demo",
  },
  {
    id: "rn-2",
    headlineEn: "Saudi Aramco maintains dividend policy amid oil volatility",
    headlineAr: "أرامكو تحافظ على سياسة التوزيعات وسط تقلب النفط",
    summaryEn: "Income investors focus on payout stability; sector sentiment stable.",
    summaryAr: "مستثمرو الدخل يركزون على استقرار التوزيع؛ مزاج القطاع مستقر.",
    affectedAssets: ["2222", "SPY"],
    expectedImpactEn: "Supportive for Saudi energy large caps; limited spillover to US tech.",
    expectedImpactAr: "داعم لكبار الطاقة السعودية؛ تأثير محدود على التقنية الأمريكية.",
    sentiment: "positive",
    publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    dataSource: "demo",
  },
  {
    id: "rn-3",
    headlineEn: "Bitcoin ETF flows slow as volatility picks up",
    headlineAr: "تباطؤ تدفقات ETF للبيتكوين مع ارتفاع التقلب",
    summaryEn: "Crypto risk appetite cools; correlation with NASDAQ remains high.",
    summaryAr: "تراجع شهية مخاطر الكrypto؛ الارتباط مع ناسdaq مرتفع.",
    affectedAssets: ["BTC", "ETH", "AAPL"],
    expectedImpactEn: "Near-term neutral-to-bearish for crypto; watch tech beta.",
    expectedImpactAr: "محايد إلى هابط قصير الأجل للكrypto؛ مراقبة بيتا التقنية.",
    sentiment: "negative",
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    dataSource: "demo",
  },
];

export async function getResearchNews(): Promise<{ items: ResearchNewsItem[]; dataSource: "live" | "demo" }> {
  const live = isNewsConfigured();
  return {
    items: DEMO_NEWS.map((n) => ({ ...n, dataSource: live ? "live" : "demo" })),
    dataSource: live ? "live" : "demo",
  };
}
