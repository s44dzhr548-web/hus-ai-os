/** Phase 1 — placeholder distribution & simulation (no real integrations) */

export const PLATFORM_KEYS = [
  { key: "META", labelAr: "مeta", labelEn: "Meta", weight: 0.36 },
  { key: "TIKTOK", labelAr: "TikTok", labelEn: "TikTok", weight: 0.28 },
  { key: "SNAPCHAT", labelAr: "Snapchat", labelEn: "Snapchat", weight: 0.24 },
  { key: "GOOGLE", labelAr: "Google", labelEn: "Google", weight: 0.12 },
] as const;

export const FUTURE_PLATFORMS = [
  { key: "META", labelAr: "Meta", category: "ads" },
  { key: "INSTAGRAM", labelAr: "Instagram", category: "ads" },
  { key: "FACEBOOK", labelAr: "Facebook", category: "ads" },
  { key: "TIKTOK", labelAr: "TikTok", category: "ads" },
  { key: "SNAPCHAT", labelAr: "Snapchat", category: "ads" },
  { key: "GOOGLE", labelAr: "Google Ads", category: "ads" },
  { key: "YOUTUBE", labelAr: "YouTube", category: "ads" },
  { key: "WHATSAPP", labelAr: "WhatsApp", category: "messaging" },
  { key: "SMS", labelAr: "SMS", category: "messaging" },
  { key: "EMAIL", labelAr: "Email", category: "messaging" },
] as const;

export const GOAL_OPTIONS = [
  { type: "INCREASE_SALES", labelAr: "زيادة المبيعات" },
  { type: "INCREASE_RESERVATIONS", labelAr: "زيادة الحجوزات" },
  { type: "INCREASE_WALKINS", labelAr: "زيادة الزوار" },
  { type: "INCREASE_DELIVERY", labelAr: "زيادة التوصيل" },
  { type: "INCREASE_RETURNING", labelAr: "زيادة العملاء العائدين" },
  { type: "INCREASE_WHATSAPP", labelAr: "زيادة واتساب" },
  { type: "INCREASE_REVIEWS", labelAr: "زيادة التقييمات" },
  { type: "INCREASE_FOLLOWERS", labelAr: "زيادة المتابعين" },
] as const;

export const TIMELINE_STEPS = [
  { step: "BUDGET_CREATED", labelAr: "إنشاء الميزانية" },
  { step: "AI_ANALYSIS", labelAr: "تحليل AI" },
  { step: "CAMPAIGN_SUGGESTED", labelAr: "اقتراح الحملة" },
  { step: "BUDGET_OPTIMIZATION", labelAr: "تحسين الميزانية" },
  { step: "EXPECTED_RESULT", labelAr: "النتيجة المتوقعة" },
  { step: "COMPLETED", labelAr: "مكتمل" },
] as const;

export const MC_NAV = [
  { href: "/dashboard/marketing-center", label: "الرئيسية" },
  { href: "/dashboard/marketing-center/budget", label: "الميزانية الذكية" },
  { href: "/dashboard/marketing-center/recommendations", label: "التوصيات" },
  { href: "/dashboard/marketing-center/investment", label: "الاستثمار" },
  { href: "/dashboard/marketing-center/performance", label: "الأداء" },
  { href: "/dashboard/marketing-center/decisions", label: "مركز القرارات" },
  { href: "/dashboard/marketing-center/goals", label: "الأهداف" },
  { href: "/dashboard/marketing-center/timeline", label: "الجدول الزمني" },
  { href: "/dashboard/marketing-center/integrations", label: "التكاملات" },
  { href: "/dashboard/marketing-center/chat", label: "محادثة AI" },
  { href: "/dashboard/marketing-center/simulation", label: "المحاكاة" },
] as const;

export function distributeBudget(daily: number) {
  return PLATFORM_KEYS.map((p) => ({
    platform: p.key,
    labelAr: p.labelAr,
    amount: Math.round(daily * p.weight),
    percent: Math.round(p.weight * 100),
  }));
}

export function runSimulation(budget: number) {
  const customerRates = { META: 12, TIKTOK: 18, SNAPCHAT: 15, GOOGLE: 6 };
  const distribution = distributeBudget(budget);
  const platforms = distribution.map((d) => ({
    ...d,
    expectedCustomers: customerRates[d.platform as keyof typeof customerRates] ?? 8,
  }));
  const totalCustomers = platforms.reduce((s, p) => s + p.expectedCustomers, 0);
  const expectedRevenue = Math.round(totalCustomers * 240);
  const expectedProfit = Math.round(expectedRevenue * 0.32);
  const expectedRoi = budget > 0 ? Math.round((expectedProfit / budget) * 100) : 0;

  return {
    platforms,
    totalCustomers,
    expectedRevenue,
    expectedProfit,
    expectedRoi,
  };
}

export const DEFAULT_RECOMMENDATIONS = [
  { type: "INCREASE_TIKTOK", titleAr: "زيادة ميزانية TikTok", description: "أداء أعلى في اكتساب العملاء" },
  { type: "DECREASE_META", titleAr: "تقليل ميزانية Meta", description: "تكلفة اكتساب مرتفعة" },
  { type: "PAUSE_SNAPCHAT", titleAr: "إيقاف Snapchat مؤقتاً", description: "عائد منخفض هذا الأسبوع" },
  { type: "INCREASE_GOOGLE", titleAr: "زيادة Google Search", description: "نية شراء عالية" },
  { type: "WEEKEND_CAMPAIGN", titleAr: "حملة نهاية الأسبوع", description: "فرصة مبيعات قوية" },
  { type: "PROMOTE_COFFEE", titleAr: "ترويج القهوة", description: "طلب صباحي مرتفع" },
  { type: "PROMOTE_LUNCH", titleAr: "ترويج الغداء", description: "ذروة 12-2" },
  { type: "PROMOTE_FAMILY", titleAr: "ترويج وجبات عائلية", description: "مناسب للعائلات" },
  { type: "PROMOTE_DELIVERY", titleAr: "ترويج التوصيل", description: "زيادة طلبات التوصيل" },
];

export function stubChatReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("500") || q.includes("أنفق") || q.includes("spend")) {
    return "للميزانية 500 ر.س يومياً: TikTok 140 · Meta 180 · Snapchat 120 · Google 60 — توصية AI فقط (Phase 1).";
  }
  if (q.includes("tiktok") || q.includes("better")) {
    return "TikTok يظهر تكلفة اكتساب أقل في المحاكاة (+18% عميل متوقع). لا تنفيذ فعلي في Phase 1.";
  }
  if (q.includes("reservation") || q.includes("حجز")) {
    return "لزيادة الحجوزات: ركّز 35% من الميزانية على Meta + حملة نهاية الأسبوع (توصية UI).";
  }
  if (q.includes("tomorrow") || q.includes("غدا") || q.includes("غداً")) {
    return "غداً: ترويج الغداء + Story على Snapchat — محاكاة فقط.";
  }
  return "مركز التسويق AI — Phase 1 (معمارية). اسأل عن الميزانية، المنصات، أو الحجوزات.";
}
