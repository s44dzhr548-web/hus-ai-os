/** Full Marketing Command Center navigation — /dashboard/marketing/* only */

/** WhatsApp-focused marketing navigation (sidebar section under التسويق) */
export const WHATSAPP_MARKETING_NAV = [
  { href: "/dashboard/marketing/automations", label: "الرسائل التلقائية" },
  { href: "/dashboard/marketing/whatsapp", label: "واتساب الأعمال" },
  { href: "/dashboard/marketing/whatsapp?tab=templates", label: "القوالب" },
  { href: "/dashboard/marketing/campaigns", label: "الحملات" },
  { href: "/dashboard/marketing/whatsapp?tab=delivery", label: "نتائج الإرسال" },
] as const;

export const MARKETING_NAV = [
  ...WHATSAPP_MARKETING_NAV,
  { href: "/dashboard/marketing/command-center", label: "مركز القيادة" },
  { href: "/dashboard/marketing/goals", label: "أهداف المطعم" },
  { href: "/dashboard/marketing/budget", label: "الميزانية الذكية" },
  { href: "/dashboard/marketing/allocation", label: "توزيع الميزانية" },
  { href: "/dashboard/marketing/simulation", label: "المحاكاة" },
  { href: "/dashboard/marketing/opportunities", label: "الفرص" },
  { href: "/dashboard/marketing/decisions", label: "قرارات AI" },
  { href: "/dashboard/marketing/creative", label: "الإبداع" },
  { href: "/dashboard/marketing/copywriting", label: "الكتابة" },
  { href: "/dashboard/marketing/audiences", label: "الجمهور" },
  { href: "/dashboard/marketing/customer-journey", label: "رحلة العميل" },
  { href: "/dashboard/marketing/analytics", label: "التحليلات" },
  { href: "/dashboard/marketing/reports", label: "التقارير" },
  { href: "/dashboard/marketing/assistant", label: "مساعد AI" },
  { href: "/dashboard/marketing/ai-brain", label: "AI Brain" },
  { href: "/dashboard/marketing/platforms", label: "المنصات" },
  { href: "/dashboard/marketing/connections", label: "الربط" },
  { href: "/dashboard/marketing/costs", label: "التكلفة" },
  { href: "/dashboard/marketing/settings", label: "الإعدادات" },
  { href: "/dashboard/marketing/audit-log", label: "سجل التدقيق" },
] as const;

export const COMMAND_NAV = MARKETING_NAV;

export type DataLabelType = "real" | "simulation" | "not_connected" | "insufficient";

export const DATA_LABELS: Record<DataLabelType, string> = {
  real: "بيانات فعلية",
  simulation: "محاكاة تقديرية",
  not_connected: "غير مربوط",
  insufficient: "بيانات غير كافية",
};

export const RESTAURANT_GOALS = [
  { id: "INCREASE_SALES", labelAr: "زيادة المبيعات" },
  { id: "INCREASE_RESERVATIONS", labelAr: "زيادة الحجوزات" },
  { id: "INCREASE_WALKINS", labelAr: "زيادة زيارات المطعم" },
  { id: "INCREASE_DELIVERY", labelAr: "زيادة الطلبات الخارجية" },
  { id: "INCREASE_RETURNING", labelAr: "زيادة العملاء العائدين" },
  { id: "INCREASE_AOV", labelAr: "زيادة متوسط الفاتورة" },
  { id: "INCREASE_WHATSAPP", labelAr: "زيادة رسائل واتساب" },
  { id: "INCREASE_REVIEWS", labelAr: "زيادة التقييمات" },
  { id: "PROMOTE_DISH", labelAr: "الترويج لطبق معين" },
  { id: "PROMOTE_OFFER", labelAr: "الترويج لعرض" },
  { id: "PROMOTE_EVENT", labelAr: "الترويج لفعالية" },
  { id: "PROMOTE_BRANCH", labelAr: "الترويج لفرع معين" },
  { id: "REACTIVATE_INACTIVE", labelAr: "استرجاع العملاء غير النشطين" },
  { id: "BRAND_AWARENESS", labelAr: "رفع الوعي بالعلامة التجارية" },
] as const;

export const CAMPAIGN_WORKFLOW_STATUSES = [
  { id: "DRAFT", labelAr: "Draft" },
  { id: "AI_PREPARING", labelAr: "AI Preparing" },
  { id: "READY_FOR_REVIEW", labelAr: "Ready for Review" },
  { id: "APPROVED", labelAr: "Approved" },
  { id: "WAITING_CONNECTION", labelAr: "Waiting for Connection" },
  { id: "SCHEDULED", labelAr: "Scheduled" },
  { id: "ACTIVE", labelAr: "Active" },
  { id: "PAUSED", labelAr: "Paused" },
  { id: "COMPLETED", labelAr: "Completed" },
  { id: "FAILED", labelAr: "Failed" },
  { id: "ARCHIVED", labelAr: "Archived" },
] as const;

export const MARKETING_AGENTS = [
  { id: "MARKETING_MANAGER", labelAr: "Marketing Manager" },
  { id: "DATA_ANALYST", labelAr: "Data Analyst" },
  { id: "BUDGET_OPTIMIZER", labelAr: "Budget Optimizer" },
  { id: "CAMPAIGN_STRATEGIST", labelAr: "Campaign Strategist" },
  { id: "COPYWRITER", labelAr: "Copywriter" },
  { id: "CREATIVE_DIRECTOR", labelAr: "Creative Director" },
  { id: "VIDEO_PRODUCER", labelAr: "Video Producer" },
  { id: "CUSTOMER_INTEL", labelAr: "Customer Intelligence" },
  { id: "OPPORTUNITY_FINDER", labelAr: "Opportunity Finder" },
  { id: "PERFORMANCE_ANALYST", labelAr: "Performance Analyst" },
  { id: "FORECASTING", labelAr: "Forecasting Agent" },
  { id: "REPORTING", labelAr: "Reporting Agent" },
  { id: "COMPLIANCE", labelAr: "Compliance & Consent" },
] as const;

export const DATA_LABEL = {
  SIMULATION: "محاكاة تقديرية",
  DEMO: "بيانات تجريبية",
  NOT_CONNECTED: "غير مربوط",
  REAL: "بيانات فعلية",
  INSUFFICIENT: "بيانات غير كافية",
} as const;

export const BUDGET_GOALS = RESTAURANT_GOALS.slice(0, 8);

export const PLATFORMS = [
  { key: "META", labelAr: "Meta" },
  { key: "TIKTOK", labelAr: "TikTok" },
  { key: "SNAPCHAT", labelAr: "Snapchat" },
  { key: "GOOGLE", labelAr: "Google" },
  { key: "RESERVE", labelAr: "احتياطي" },
] as const;

export const GOAL_WEIGHTS: Record<string, Record<string, number>> = {
  INCREASE_RESERVATIONS: { META: 0.36, TIKTOK: 0.28, SNAPCHAT: 0.24, GOOGLE: 0.12 },
  INCREASE_SALES: { META: 0.36, TIKTOK: 0.28, SNAPCHAT: 0.24, GOOGLE: 0.12 },
  INCREASE_WALKINS: { META: 0.32, TIKTOK: 0.28, SNAPCHAT: 0.28, GOOGLE: 0.12 },
  INCREASE_DELIVERY: { META: 0.24, TIKTOK: 0.34, SNAPCHAT: 0.2, GOOGLE: 0.22 },
  INCREASE_RETURNING: { META: 0.35, TIKTOK: 0.2, SNAPCHAT: 0.25, GOOGLE: 0.2 },
  INCREASE_WHATSAPP: { META: 0.4, TIKTOK: 0.3, SNAPCHAT: 0.2, GOOGLE: 0.1 },
  INCREASE_REVIEWS: { META: 0.38, TIKTOK: 0.32, SNAPCHAT: 0.2, GOOGLE: 0.1 },
};

export const PLATFORM_CPA: Record<string, number> = {
  META: 42, TIKTOK: 28, SNAPCHAT: 35, GOOGLE: 55, RESERVE: 0,
};

export const ALLOCATION_REASONS: Record<string, string> = {
  META: "قوي للحجوزات والوصول العائلي",
  TIKTOK: "تكلفة اكتساب أقل للفئة الشابة",
  SNAPCHAT: "فعّال للعروض السريعة",
  GOOGLE: "نية شراء عالية في البحث المحلي",
  RESERVE: "احتياطي محمي للتعديلات",
};

export const CAMPAIGN_STATUSES = CAMPAIGN_WORKFLOW_STATUSES;

export const AUTOMATION_TYPES = [
  { id: "THANK_YOU", labelAr: "شكر بعد الزيارة" },
  { id: "FEEDBACK", labelAr: "طلب تقييم" },
  { id: "BIRTHDAY", labelAr: "عيد ميلاد" },
  { id: "INACTIVE_OFFER", labelAr: "عرض عميل غير نشط" },
  { id: "WEEKEND", labelAr: "عرض نهاية الأسبوع" },
  { id: "RESERVATION_REMINDER", labelAr: "تذكير حجز" },
  { id: "ABANDONED_RESERVATION", labelAr: "حجز متروك" },
  { id: "RETURN_COUPON", labelAr: "كوبون إعادة زيارة" },
  { id: "VIP_OFFER", labelAr: "عرض VIP" },
  { id: "LOW_RATING_RECOVERY", labelAr: "استرداد تقييم منخفض" },
  { id: "WEEKLY_REPORT", labelAr: "تقرير أسبوعي" },
  { id: "MONTHLY_REPORT", labelAr: "تقرير شهري" },
  { id: "BUDGET_ALERT", labelAr: "تنبيه ميزانية" },
  { id: "CAMPAIGN_FAILURE", labelAr: "تنبيه فشل حملة" },
] as const;

export const CREATIVE_TABS = [
  "Images", "Videos", "Captions", "Headlines", "Stories", "Reels", "Shorts", "Carousel",
] as const;

export const INTEGRATIONS = [
  { key: "OPENAI", labelAr: "OpenAI" },
  { key: "CLAUDE", labelAr: "Claude" },
  { key: "GEMINI", labelAr: "Gemini" },
  { key: "META", labelAr: "Meta Ads" },
  { key: "GOOGLE", labelAr: "Google Ads" },
  { key: "TIKTOK", labelAr: "TikTok Ads" },
  { key: "SNAPCHAT", labelAr: "Snapchat Ads" },
  { key: "RUNWAY", labelAr: "Runway" },
  { key: "KLING", labelAr: "Kling AI" },
  { key: "GOOGLE_VEO", labelAr: "Google Veo" },
  { key: "LEONARDO", labelAr: "Leonardo" },
  { key: "MIDJOURNEY", labelAr: "Midjourney" },
  { key: "IDEOGRAM", labelAr: "Ideogram" },
  { key: "HEYGEN", labelAr: "HeyGen" },
  { key: "PIKA", labelAr: "Pika" },
  { key: "LUMA", labelAr: "Luma" },
  { key: "FIREFLY", labelAr: "Firefly" },
  { key: "FLUX", labelAr: "Flux" },
  { key: "RECRAFT", labelAr: "Recraft" },
] as const;

/** Phase C allocation: Meta 180 · TikTok 140 · Snap 120 · Google 60 of 500 */
export const SMART_ALLOCATION_500 = [
  { platform: "META", percent: 36, amount: 180 },
  { platform: "TIKTOK", percent: 28, amount: 140 },
  { platform: "SNAPCHAT", percent: 24, amount: 120 },
  { platform: "GOOGLE", percent: 12, amount: 60 },
] as const;
