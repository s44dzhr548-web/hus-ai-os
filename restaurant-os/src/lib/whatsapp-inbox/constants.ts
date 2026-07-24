export const WHATSAPP_INBOX_CATEGORIES = [
  { id: "RESERVATION", labelAr: "حجز" },
  { id: "ORDER", labelAr: "طلب" },
  { id: "COMPLAINT", labelAr: "شكوى" },
  { id: "INQUIRY", labelAr: "استفسار" },
  { id: "OTHER", labelAr: "أخرى" },
] as const;

export type WhatsAppInboxCategory = (typeof WHATSAPP_INBOX_CATEGORIES)[number]["id"];

export const DEFAULT_QUICK_REPLIES = [
  "مرحباً بك في فابريكا لاونج، كيف نقدر نخدمك؟",
  "شكراً لتواصلك، سنعود إليك خلال دقائق.",
  "هل ترغب بتأكيد حجزك؟",
  "نعتذر عن التأخير — فريقنا يراجع طلبك الآن.",
];

export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
