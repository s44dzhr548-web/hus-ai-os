/** Client-safe provider UI constants (no server env) */

export const STATUS_LABELS: Record<string, string> = {
  DISCONNECTED: "غير متصل",
  CONNECTED: "متصل",
  NEEDS_RECONNECT: "يحتاج إعادة ربط",
  INVALID_KEY: "المفتاح غير صالح",
  EXPIRED: "انتهت الصلاحية",
  HEALTHY: "يعمل بشكل طبيعي",
};

export const BRAIN_ROLES = [
  { id: "MARKETING_MANAGER", labelAr: "مدير التسويق" },
  { id: "DATA_ANALYST", labelAr: "محلل البيانات" },
  { id: "BUDGET_ALLOCATOR", labelAr: "موزع الميزانية" },
  { id: "AD_COPYWRITER", labelAr: "كاتب الإعلانات" },
  { id: "CAMPAIGN_ANALYST", labelAr: "محلل الحملات" },
  { id: "CUSTOMER_ANALYST", labelAr: "محلل العملاء" },
  { id: "OPPORTUNITY_FINDER", labelAr: "مكتشف الفرص" },
  { id: "REPORT_BUILDER", labelAr: "منشئ التقارير" },
] as const;

export const IMAGE_TASKS = [
  { id: "DISH_PHOTOS", labelAr: "صور أطباق" },
  { id: "RESTAURANT_OFFERS", labelAr: "عروض المطعم" },
  { id: "INSTAGRAM_POSTS", labelAr: "منشورات إنستجرام" },
  { id: "STORIES", labelAr: "ستوري" },
  { id: "BANNERS", labelAr: "بانرات" },
  { id: "SEASONAL_ADS", labelAr: "إعلانات موسمية" },
  { id: "REALISTIC", labelAr: "صور واقعية" },
  { id: "ARABIC_TEXT", labelAr: "تصاميم تحتوي نصوص عربية" },
] as const;

export const VIDEO_TASKS = [
  { id: "TIKTOK", labelAr: "TikTok video" },
  { id: "INSTAGRAM_REEL", labelAr: "Instagram Reel" },
  { id: "SNAPCHAT_STORY", labelAr: "Snapchat Story" },
  { id: "YOUTUBE_SHORT", labelAr: "YouTube Short" },
  { id: "INTRO", labelAr: "Restaurant introduction" },
  { id: "PRODUCT", labelAr: "Product video" },
  { id: "OFFER", labelAr: "Offer video" },
  { id: "EVENT", labelAr: "Event announcement" },
] as const;

export type ProviderCategory = "BRAIN" | "IMAGE" | "VIDEO" | "AUDIO" | "COPY";
