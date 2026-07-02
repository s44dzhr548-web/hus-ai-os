export interface EnterpriseCompetitorProfile {
  id: string;
  nameEn: string;
  nameAr: string;
  strengthsEn: string[];
  strengthsAr: string[];
  weaknessesEn: string[];
  weaknessesAr: string[];
  featuresEn: string[];
  featuresAr: string[];
  pricingEn: string;
  pricingAr: string;
  marketsEn: string;
  marketsAr: string;
  aiLevelEn: string;
  aiLevelAr: string;
  realTimeData: boolean;
  brokerIntegration: boolean;
  uniqueFeaturesEn: string[];
  uniqueFeaturesAr: string[];
}

export const ENTERPRISE_COMPETITORS: EnterpriseCompetitorProfile[] = [
  {
    id: "husai",
    nameEn: "HUSAI Trading AI",
    nameAr: "HUSAI تداول AI",
    strengthsEn: ["Arabic-first AI", "Multi-provider failover", "Paper-only safety", "Saudi intelligence", "Explainable multi-agent"],
    strengthsAr: ["AI عربي أولاً", "تبديل مزودين", "أمان ورقي", "ذكاء سعودي", "وكلاء قابلون للتفسير"],
    weaknessesEn: ["No licensed broker yet", "Enterprise data keys optional"],
    weaknessesAr: ["لا وسيط مرخص بعد", "مفاتيح مؤسسية اختيارية"],
    featuresEn: ["CEO dashboard", "Auto bot", "Risk Guardian Pro", "Strategy marketplace", "Provider manager"],
    featuresAr: ["لوحة CEO", "بوت تلقائي", "حارس مخاطر", "سوق استراتيجيات", "مدير مزودين"],
    pricingEn: "Freemium paper platform",
    pricingAr: "منصة ورقية مجانية/مدفوعة",
    marketsEn: "US, Saudi, Crypto, Forex, Commodities, Indices",
    marketsAr: "US، سعودي، crypto، فوركس، سلع، مؤشرات",
    aiLevelEn: "Multi-agent consensus + explainability",
    aiLevelAr: "إجماع متعدد الوكلاء + تفسير",
    realTimeData: true,
    brokerIntegration: false,
    uniqueFeaturesEn: ["Arabic RTL default", "Auto improvement engine", "Cross-market brain"],
    uniqueFeaturesAr: ["عربي RTL افتراضي", "محرك تحسين", "عقل أسواق متقاطعة"],
  },
  {
    id: "bloomberg",
    nameEn: "Bloomberg Terminal",
    nameAr: "بلومبرغ",
    strengthsEn: ["Gold-standard data", "Institutional trust", "Deep news"],
    strengthsAr: ["بيانات مرجعية", "ثقة مؤسسية", "أخبار عميقة"],
    weaknessesEn: ["Very expensive", "No Arabic UX", "Overkill for retail"],
    weaknessesAr: ["مكلف جداً", "بدون UX عربي", "زائد للأفراد"],
    featuresEn: ["Terminal", "Analytics", "Messaging", "Fixed income"],
    featuresAr: ["Terminal", "تحليلات", "رسائل"],
    pricingEn: "~$24,000+/year",
    pricingAr: "~24000$/سنة+",
    marketsEn: "Global all asset classes",
    marketsAr: "عالمي كل الأصول",
    aiLevelEn: "Limited native AI",
    aiLevelAr: "AI محدود",
    realTimeData: true,
    brokerIntegration: true,
    uniqueFeaturesEn: ["B-PIPE", "Bloomberg Intelligence"],
    uniqueFeaturesAr: ["B-PIPE"],
  },
  {
    id: "tradingview",
    nameEn: "TradingView",
    nameAr: "TradingView",
    strengthsEn: ["Best charting", "Huge community", "Pine Script"],
    strengthsAr: ["أفضل رسوم", "مجتمع ضخم", "Pine Script"],
    weaknessesEn: ["Limited AI", "Partial Arabic"],
    weaknessesAr: ["AI محدود", "عربية جزئية"],
    featuresEn: ["Charts", "Screeners", "Social", "Alerts"],
    featuresAr: ["رسوم", "فلاتر", "اجتماعي"],
    pricingEn: "Free – $59.95/mo Pro+",
    pricingAr: "مجاني – 59.95$/شهر",
    marketsEn: "Global",
    marketsAr: "عالمي",
    aiLevelEn: "Basic indicators",
    aiLevelAr: "مؤشرات أساسية",
    realTimeData: true,
    brokerIntegration: true,
    uniqueFeaturesEn: ["Pine Script ecosystem"],
    uniqueFeaturesAr: ["Pine Script"],
  },
  {
    id: "mubasher",
    nameEn: "Mubasher",
    nameAr: "مباشر",
    strengthsEn: ["Saudi/MENA focus", "Arabic", "Local market depth"],
    strengthsAr: ["تركيز سعودي/MENA", "عربي", "عمق محلي"],
    weaknessesEn: ["Limited global AI", "Broker-tied"],
    weaknessesAr: ["AI عالمي محدود", "مرتبط بالوسيط"],
    featuresEn: ["Tadawul data", "Arabic news", "Portfolio"],
    featuresAr: ["بيانات تداول", "أخبار عربية"],
    pricingEn: "Broker/subscription",
    pricingAr: "وسيط/اشتراك",
    marketsEn: "Saudi, MENA",
    marketsAr: "سعودي، MENA",
    aiLevelEn: "Low",
    aiLevelAr: "منخفض",
    realTimeData: true,
    brokerIntegration: true,
    uniqueFeaturesEn: ["Tadawul native Arabic UX"],
    uniqueFeaturesAr: ["UX عربي لتداول"],
  },
  {
    id: "derayah",
    nameEn: "Derayah",
    nameAr: "دراية",
    strengthsEn: ["Saudi broker", "Local compliance", "Arabic app"],
    strengthsAr: ["وسيط سعودي", "امتثال محلي", "تطبيق عربي"],
    weaknessesEn: ["No advanced AI analytics", "Saudi-only focus"],
    weaknessesAr: ["بدون تحليل AI متقدم"],
    featuresEn: ["Trading", "Research reports", "Mutual funds"],
    featuresAr: ["تداول", "تقارير", "صناديق"],
    pricingEn: "Commission-based",
    pricingAr: "عمولة",
    marketsEn: "Saudi + select global",
    marketsAr: "سعودي + عالمي محدود",
    aiLevelEn: "Minimal",
    aiLevelAr: "minimal",
    realTimeData: true,
    brokerIntegration: true,
    uniqueFeaturesEn: ["CMA-regulated Saudi broker"],
    uniqueFeaturesAr: ["وسيط CMA"],
  },
  {
    id: "sahm",
    nameEn: "Sahm",
    nameAr: "سهم",
    strengthsEn: ["Modern Saudi UX", "Mobile-first", "US + Saudi"],
    strengthsAr: ["UX سعودي حديث", "موبايل", "US + سعودي"],
    weaknessesEn: ["Limited AI depth", "Real execution only"],
    weaknessesAr: ["عمق AI محدود"],
    featuresEn: ["Fractional US", "Saudi stocks", "Watchlists"],
    featuresAr: ["US جزئي", "أسهم سعودية"],
    pricingEn: "Commission + FX fees",
    pricingAr: "عمولة + FX",
    marketsEn: "Saudi, US",
    marketsAr: "سعودي، US",
    aiLevelEn: "Low",
    aiLevelAr: "منخفض",
    realTimeData: true,
    brokerIntegration: true,
    uniqueFeaturesEn: ["Dual-market Saudi retail app"],
    uniqueFeaturesAr: ["تطبيق سعودي ثنائي السوق"],
  },
];

export function getEnterpriseCompetitors() {
  return ENTERPRISE_COMPETITORS;
}
