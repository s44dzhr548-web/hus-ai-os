/** Safe user-facing messages — never include tokens. */
export const GOOGLE_BUSINESS_ERROR_AR: Record<string, string> = {
  API_ACCESS_NOT_APPROVED: "بانتظار موافقة Google Business Profile API",
  LOCATION_NOT_VERIFIED: "الموقع غير موثّق في Google — أكمل التحقق من Google",
  INSUFFICIENT_OAUTH_SCOPE: "صلاحيات OAuth غير كافية — أعد الربط مع business.manage",
  TOKEN_EXPIRED: "انتهت جلسة Google — أعد ربط Google Business Profile",
  LOCATION_NOT_SELECTED: "اختر موقع فابريكا من قائمة المواقع",
  GOOGLE_API_QUOTA: "تم تجاوز حصة Google API — حاول لاحقاً",
  GOOGLE_API_REQUEST_FAILED: "فشل طلب Google Business Profile",
  GOOGLE_ACCOUNT_NOT_CONNECTED: "Google Business Profile غير مربوط",
  REVIEW_NOT_FOUND: "المراجعة غير موجودة",
  PUBLISH_PERMISSION_DENIED: "ليس لديك صلاحية نشر الرد",
};

export function googleBusinessErrorMessage(code: string, fallback?: string): string {
  return GOOGLE_BUSINESS_ERROR_AR[code] || fallback || GOOGLE_BUSINESS_ERROR_AR.GOOGLE_API_REQUEST_FAILED;
}

export const GBP_OAUTH_SCOPE = "https://www.googleapis.com/auth/business.manage";

export { gbpRedirectUri, DEFAULT_GOOGLE_BUSINESS_REDIRECT_URI } from "@/lib/google-business/oauth-config";
