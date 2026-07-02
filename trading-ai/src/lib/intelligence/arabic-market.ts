import type { ArabicMarketBrief } from "@/types/trading";

export function getArabicMarketBrief(): ArabicMarketBrief {
  return {
    headlineAr: "ذكاء السوق العربي — تركيز الخليج والسعودية",
    headlineEn: "Arabic Market Intelligence — Gulf & Saudi focus",
    focusAreas: [
      {
        titleAr: "السوق السعودي (تداول)",
        titleEn: "Saudi Market (Tadawul)",
        detailAr: "أرامكو، سابك، البنوك — حساسية النفط وOPEC+ ودورات السيولة المحلية.",
        detailEn: "Aramco, SABIC, banks — oil/OPEC+ sensitivity and local liquidity.",
      },
      {
        titleAr: "أسعار الفائدة والريال",
        titleEn: "Rates & SAR peg",
        detailAr: "قرارات الفيد الأمريكي تنعكس على سياسة SAMA وقطاع البنوك.",
        detailEn: "Fed decisions flow through SAMA policy and banking sector.",
      },
      {
        titleAr: "النفط والطاقة",
        titleEn: "Oil & energy",
        detailAr: "برنت يحرك الطاقة والنقل والبتروكيماويات في المنطقة.",
        detailEn: "Brent drives regional energy, transport, and petrochemicals.",
      },
      {
        titleAr: "مصطلحات مالية عربية",
        titleEn: "Arabic financial terms",
        detailAr: "شراء · احتفاظ · بيع · دعم · مقاومة · تقلب · سيولة · مخاطر.",
        detailEn: "Buy/Hold/Sell · support · resistance · volatility · liquidity · risk.",
      },
    ],
    saudiHighlights: [
      { symbol: "2222", nameAr: "أرامكو", noteAr: "Heavyweight — ارتباط Brent", noteEn: "Heavyweight — Brent correlation" },
      { symbol: "1120", nameAr: "الراجحي", noteAr: "بنوك — حساسية الفائدة", noteEn: "Banks — rate sensitivity" },
      { symbol: "2010", nameAr: "سابك", noteAr: "بتروكيماويات — سلسلة النفط", noteEn: "Petrochemicals — oil chain" },
    ],
  };
}
