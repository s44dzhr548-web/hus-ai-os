export const CAMPAIGN_GOALS = [
  { id: "INCREASE_SALES", labelAr: "زيادة المبيعات", labelEn: "Increase Sales" },
  { id: "INCREASE_RESERVATIONS", labelAr: "زيادة الحجوزات", labelEn: "Increase Reservations" },
  { id: "INCREASE_WHATSAPP", labelAr: "زيادة واتساب", labelEn: "Increase WhatsApp" },
  { id: "PROMOTE_OFFER", labelAr: "ترويج عرض", labelEn: "Promote Offer" },
  { id: "PROMOTE_NEW_MENU", labelAr: "ترويج منيو جديد", labelEn: "Promote New Menu" },
  { id: "PROMOTE_EVENT", labelAr: "ترويج فعالية", labelEn: "Promote Event" },
  { id: "INCREASE_FOLLOWERS", labelAr: "زيادة المتابعين", labelEn: "Increase Followers" },
] as const;

export const AD_PLATFORMS = [
  { id: "META", label: "Meta Ads", oauth: true },
  { id: "INSTAGRAM", label: "Instagram Ads", oauth: true, parent: "META" },
  { id: "FACEBOOK", label: "Facebook Ads", oauth: true, parent: "META" },
  { id: "MESSENGER", label: "Messenger", oauth: true, parent: "META" },
  { id: "TIKTOK", label: "TikTok Ads", oauth: true },
  { id: "SNAPCHAT", label: "Snapchat Ads", oauth: true },
  { id: "GOOGLE", label: "Google Ads", oauth: true },
  { id: "YOUTUBE", label: "YouTube Ads", oauth: true, parent: "GOOGLE" },
  { id: "X", label: "X Ads", oauth: true },
] as const;

export const CREATIVE_TYPES = [
  { id: "FOOD_IMAGE", labelAr: "صورة طعام" },
  { id: "POSTER", labelAr: "بوستر" },
  { id: "STORY", labelAr: "ستوري" },
  { id: "INSTAGRAM_POST", labelAr: "منشور إنستغرام" },
  { id: "TIKTOK_COVER", labelAr: "غلاف تيك توك" },
  { id: "FACEBOOK_AD", labelAr: "إعلان فيسبوك" },
  { id: "SNAPCHAT_AD", labelAr: "إعلان سناب" },
  { id: "FLYER", labelAr: "منشور مطعم" },
  { id: "SEASONAL_RAMADAN", labelAr: "رمضان" },
  { id: "SEASONAL_EID", labelAr: "عيد" },
  { id: "SEASONAL_NATIONAL_DAY", labelAr: "اليوم الوطني" },
  { id: "SEASONAL_SUMMER", labelAr: "صيف" },
  { id: "SEASONAL_WINTER", labelAr: "شتاء" },
] as const;

export const VIDEO_TYPES = [
  { id: "VIDEO_15S", labelAr: "15 ثانية", duration: 15 },
  { id: "VIDEO_30S", labelAr: "30 ثانية", duration: 30 },
  { id: "VIDEO_60S", labelAr: "60 ثانية", duration: 60 },
  { id: "VIDEO_REEL", labelAr: "ريل إنستغرام", duration: 30 },
  { id: "VIDEO_TIKTOK", labelAr: "تيك توك", duration: 30 },
  { id: "VIDEO_SNAP_STORY", labelAr: "ستory سناب", duration: 15 },
  { id: "VIDEO_INTRO", labelAr: "مقدمة المطعم", duration: 30 },
  { id: "MENU_VIDEO", labelAr: "فيديو المنيو", duration: 60 },
] as const;

export const CUSTOMER_SEGMENTS = [
  { id: "VIP", labelAr: "VIP" },
  { id: "RETURNING", labelAr: "عملاء عائدون" },
  { id: "INACTIVE", labelAr: "غير نشطين" },
  { id: "BIRTHDAY", labelAr: "أعياد ميلاد" },
  { id: "FAMILIES", labelAr: "عائلات" },
  { id: "BREAKFAST", labelAr: "فطور" },
  { id: "LUNCH", labelAr: "غداء" },
  { id: "DINNER", labelAr: "عشاء" },
  { id: "COFFEE", labelAr: "قهوة" },
  { id: "CORPORATE", labelAr: "شركات" },
] as const;

export const MARKETING_NAV = [
  { href: "/dashboard/marketing", label: "لوحة التسويق" },
  { href: "/dashboard/marketing/campaigns", label: "إدارة الحملات" },
  { href: "/dashboard/marketing/assistant", label: "مساعد التسويق" },
  { href: "/dashboard/marketing/creative", label: "استوديو الإبداع" },
  { href: "/dashboard/marketing/video", label: "صانع الفيديو" },
  { href: "/dashboard/marketing/connections", label: "منصات الإعلان" },
  { href: "/dashboard/marketing/segments", label: "شرائح العملاء" },
  { href: "/dashboard/marketing/whatsapp", label: "تسويق واتساب" },
  { href: "/dashboard/marketing/reports", label: "التقارير" },
  { href: "/dashboard/marketing/forecast", label: "التوقعات" },
] as const;
