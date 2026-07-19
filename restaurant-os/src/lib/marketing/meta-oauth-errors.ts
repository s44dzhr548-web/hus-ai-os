export const META_OAUTH_ERROR_CODES = [
  "missing_code",
  "oauth_denied",
  "invalid_state",
  "encryption_not_configured",
  "token_exchange_failed",
  "graph_api_failed",
  "no_ad_accounts",
  "database_save_failed",
] as const;

export type MetaOAuthErrorCode = (typeof META_OAUTH_ERROR_CODES)[number];

export class MetaOAuthError extends Error {
  readonly code: MetaOAuthErrorCode;
  readonly detail?: string;

  constructor(code: MetaOAuthErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "MetaOAuthError";
    this.code = code;
    this.detail = detail;
  }
}

export const META_OAUTH_ERROR_MESSAGES_AR: Record<MetaOAuthErrorCode, string> = {
  missing_code: "لم يصل رمز OAuth من Meta — أعد المحاولة",
  oauth_denied: "تم إلغاء الموافقة على Meta",
  invalid_state: "انتهت صلاحية جلسة الربط — ابدأ من جديد",
  encryption_not_configured: "MARKETING_TOKEN_SECRET غير مضبوط على الخادم",
  token_exchange_failed: "فشل تبادل رمز OAuth — تحقق من Redirect URI المتطابق",
  graph_api_failed: "فشل جلب بيانات Meta Graph API — تحقق من الصلاحيات",
  no_ad_accounts: "لا توجد حسابات إعلانات مرتبطة بحسابك على Meta",
  database_save_failed: "فشل حفظ الربط في قاعدة البيانات",
};

export function isMetaOAuthErrorCode(value: string | null): value is MetaOAuthErrorCode {
  return META_OAUTH_ERROR_CODES.includes(value as MetaOAuthErrorCode);
}
