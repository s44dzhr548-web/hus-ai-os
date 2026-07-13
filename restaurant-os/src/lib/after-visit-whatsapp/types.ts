export const AFTER_VISIT_EVENT = "SESSION_COMPLETED";

export const DELAY_OPTIONS = [
  { minutes: 0, labelAr: "فوراً", labelEn: "Immediately" },
  { minutes: 5, labelAr: "5 دقائق", labelEn: "5 minutes" },
  { minutes: 15, labelAr: "15 دقيقة", labelEn: "15 minutes" },
  { minutes: 30, labelAr: "30 دقيقة", labelEn: "30 minutes" },
] as const;

export const DEFAULT_TEMPLATE_NAME = "after_visit_thank_you";

export const DEFAULT_MESSAGE_BODY = `مرحبًا {{1}}،
شكرًا لزيارتك {{2}} 🌟
سعدنا بخدمتك اليوم على الطاولة {{3}}.
نأمل تقييم تجربتك من خلال الرابط التالي:
{{4}}`;

export const MAX_SEND_ATTEMPTS = 3;

export type AfterVisitAutomationConfig = {
  isEnabled: boolean;
  delayMinutes: number;
  templateName: string;
  messageBody: string | null;
  reviewLinkBase: string | null;
  branchId: string | null;
  testPhone: string | null;
};

export const DEFAULT_AUTOMATION: AfterVisitAutomationConfig = {
  isEnabled: false,
  delayMinutes: 5,
  templateName: DEFAULT_TEMPLATE_NAME,
  messageBody: DEFAULT_MESSAGE_BODY,
  reviewLinkBase: null,
  branchId: null,
  testPhone: null,
};
