import { createHash } from "crypto";

export type RiskLevel = "low" | "medium" | "high" | "blocked";
export type PermissionGroupId =
  | "read_inspect"
  | "config_repair"
  | "code_deploy"
  | "restaurant_data"
  | "forbidden";

export type ApprovalType = "reject" | "once" | "15min" | "session" | "permanent";

export type PermissionDef = {
  key: string;
  nameAr: string;
  descriptionAr: string;
  riskLevel: RiskLevel;
  affectedSystem: string;
  dataImpact: string;
  group: PermissionGroupId;
  blocked?: boolean;
  allowPermanent?: boolean;
  maxApprovalType?: ApprovalType;
};

export const PERMISSION_GROUPS: Record<
  PermissionGroupId,
  { titleAr: string; descriptionAr: string; defaultRisk: RiskLevel }
> = {
  read_inspect: {
    titleAr: "القراءة والفحص",
    descriptionAr: "منخفضة الخطورة — فحص الحالة دون تعديل",
    defaultRisk: "low",
  },
  config_repair: {
    titleAr: "إصلاحات الإعدادات",
    descriptionAr: "متوسطة الخطورة — تتطلب موافقة قبل كل تنفيذ",
    defaultRisk: "medium",
  },
  code_deploy: {
    titleAr: "الكود والنشر",
    descriptionAr: "عالية الخطورة — موافقة لمرة واحدة فقط",
    defaultRisk: "high",
  },
  restaurant_data: {
    titleAr: "بيانات المطاعم",
    descriptionAr: "عالية الخطورة — نطاق مطعم/فرع محدد",
    defaultRisk: "high",
  },
  forbidden: {
    titleAr: "العمليات المحظورة بالكامل",
    descriptionAr: "لا يمكن تفعيلها أبداً",
    defaultRisk: "blocked",
  },
};

export const AI_ENGINEER_PERMISSIONS: PermissionDef[] = [
  // Group 1 — Read
  { key: "read_platform_health", nameAr: "فحص حالة المنصة", descriptionAr: "قراءة حالة عامة للمنصة دون تعديل", riskLevel: "low", affectedSystem: "Platform", dataImpact: "لا تعديل", group: "read_inspect", allowPermanent: true },
  { key: "read_error_logs", nameAr: "قراءة سجل الأخطاء", descriptionAr: "عرض سجلات الأخطاء دون قيم سرية", riskLevel: "low", affectedSystem: "Logs", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_vercel_status", nameAr: "قراءة حالة Vercel", descriptionAr: "فحص حالة النشر على Vercel", riskLevel: "low", affectedSystem: "Vercel", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_database_status", nameAr: "قراءة حالة قاعدة البيانات", descriptionAr: "فحص اتصال DB دون SQL", riskLevel: "low", affectedSystem: "Database", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_meta_status", nameAr: "قراءة حالة Meta", descriptionAr: "فحص تكامل Meta/WhatsApp", riskLevel: "low", affectedSystem: "Meta", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_whatsapp_status", nameAr: "قراءة حالة واتساب", descriptionAr: "فحص اتصال WhatsApp Business", riskLevel: "low", affectedSystem: "WhatsApp", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_moyasar_status", nameAr: "قراءة حالة ميسّر", descriptionAr: "فحص تكامل الدفع", riskLevel: "low", affectedSystem: "Moyasar", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_supabase_status", nameAr: "قراءة حالة Supabase", descriptionAr: "فحص حالة Supabase إن وُجد", riskLevel: "low", affectedSystem: "Supabase", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "read_openai_status", nameAr: "قراءة حالة OpenAI", descriptionAr: "فحص توفر API دون إظهار المفتاح", riskLevel: "low", affectedSystem: "OpenAI", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  { key: "run_safe_tests", nameAr: "تشغيل اختبارات آمنة", descriptionAr: "اختبارات قراءة/فحص فقط", riskLevel: "low", affectedSystem: "QA", dataImpact: "لا تعديل بيانات", group: "read_inspect", allowPermanent: true },
  { key: "read_settings_redacted", nameAr: "قراءة الإعدادات دون إظهار القيم السرية", descriptionAr: "عرض الإعدادات مع إخفاء tokens", riskLevel: "low", affectedSystem: "Config", dataImpact: "قراءة فقط", group: "read_inspect", allowPermanent: true },
  // Group 2 — Config repair
  { key: "save_waba_id", nameAr: "حفظ WABA ID", descriptionAr: "تحديث معرف WhatsApp Business", riskLevel: "medium", affectedSystem: "WhatsApp", dataImpact: "تعديل إعداد", group: "config_repair", maxApprovalType: "session" },
  { key: "save_phone_number_id", nameAr: "حفظ Phone Number ID", descriptionAr: "تحديث معرف رقم واتساب", riskLevel: "medium", affectedSystem: "WhatsApp", dataImpact: "تعديل إعداد", group: "config_repair", maxApprovalType: "session" },
  { key: "relink_oauth", nameAr: "إعادة ربط OAuth", descriptionAr: "إعادة مصادقة OAuth", riskLevel: "medium", affectedSystem: "OAuth", dataImpact: "تعديل ربط", group: "config_repair", maxApprovalType: "session" },
  { key: "resync_whatsapp_templates", nameAr: "إعادة مزامنة قوالب واتساب", descriptionAr: "سحب القوالب من Meta", riskLevel: "medium", affectedSystem: "WhatsApp", dataImpact: "مزامنة", group: "config_repair", maxApprovalType: "session" },
  { key: "resubscribe_webhook", nameAr: "إعادة الاشتراك في Webhook", descriptionAr: "إعادة تسجيل webhook", riskLevel: "medium", affectedSystem: "Webhooks", dataImpact: "تعديل ربط", group: "config_repair", maxApprovalType: "session" },
  { key: "retry_failed_sync", nameAr: "إعادة محاولة مزامنة فاشلة", descriptionAr: "Retry آمن للمزامنة", riskLevel: "medium", affectedSystem: "Sync", dataImpact: "إعادة محاولة", group: "config_repair", maxApprovalType: "session" },
  { key: "toggle_feature_flag", nameAr: "تشغيل أو إيقاف Feature Flag", descriptionAr: "تغيير flag لمطعم محدد", riskLevel: "medium", affectedSystem: "Features", dataImpact: "تعديل إعداد", group: "config_repair", maxApprovalType: "session" },
  { key: "update_non_secret_setting", nameAr: "تحديث إعداد غير سري", descriptionAr: "تعديل إعدادات عامة غير حساسة", riskLevel: "medium", affectedSystem: "Config", dataImpact: "تعديل إعداد", group: "config_repair", maxApprovalType: "session" },
  { key: "restart_background_job", nameAr: "إعادة تشغيل Background Job", descriptionAr: "إعادة تشغيل job مجدول", riskLevel: "medium", affectedSystem: "Cron", dataImpact: "تشغيل job", group: "config_repair", maxApprovalType: "session" },
  // Group 3 — Code/deploy
  { key: "create_fix_branch", nameAr: "إنشاء فرع إصلاح", descriptionAr: "فرع git جديد للإصلاح", riskLevel: "high", affectedSystem: "Git", dataImpact: "إنشاء فرع", group: "code_deploy", maxApprovalType: "once" },
  { key: "create_patch", nameAr: "إنشاء Patch", descriptionAr: "توليد patch محلي", riskLevel: "high", affectedSystem: "Code", dataImpact: "ملفات محددة", group: "code_deploy", maxApprovalType: "once" },
  { key: "edit_specific_files", nameAr: "تعديل ملفات محددة", descriptionAr: "تعديل ملفات مُحددة مسبقاً", riskLevel: "high", affectedSystem: "Code", dataImpact: "تعديل ملفات", group: "code_deploy", maxApprovalType: "once" },
  { key: "run_typecheck", nameAr: "تشغيل Typecheck", descriptionAr: "npx tsc --noEmit", riskLevel: "high", affectedSystem: "CI", dataImpact: "لا تعديل", group: "code_deploy", maxApprovalType: "once" },
  { key: "run_build", nameAr: "تشغيل Build", descriptionAr: "npm run build", riskLevel: "high", affectedSystem: "CI", dataImpact: "لا تعديل", group: "code_deploy", maxApprovalType: "once" },
  { key: "run_tests", nameAr: "تشغيل الاختبارات", descriptionAr: "تشغيل test scripts", riskLevel: "high", affectedSystem: "CI", dataImpact: "قد ينشئ QA", group: "code_deploy", maxApprovalType: "once" },
  { key: "create_commit", nameAr: "إنشاء Commit", descriptionAr: "git commit", riskLevel: "high", affectedSystem: "Git", dataImpact: "سجل git", group: "code_deploy", maxApprovalType: "once" },
  { key: "push_github", nameAr: "Push إلى GitHub", descriptionAr: "git push", riskLevel: "high", affectedSystem: "Git", dataImpact: "نشر كود", group: "code_deploy", maxApprovalType: "once" },
  { key: "deploy_staging", nameAr: "نشر إلى Staging", descriptionAr: "نشر staging", riskLevel: "high", affectedSystem: "Vercel", dataImpact: "نشر", group: "code_deploy", maxApprovalType: "once" },
  { key: "deploy_production", nameAr: "نشر إلى Production", descriptionAr: "نشر production — موافقة منفصلة قوية", riskLevel: "high", affectedSystem: "Vercel", dataImpact: "نشر حي", group: "code_deploy", maxApprovalType: "once" },
  { key: "rollback", nameAr: "Rollback", descriptionAr: "التراجع عن نشر", riskLevel: "high", affectedSystem: "Vercel", dataImpact: "تغيير نسخة", group: "code_deploy", maxApprovalType: "once" },
  { key: "run_additive_migration", nameAr: "تشغيل Migration إضافية فقط", descriptionAr: "migrate deploy — إضافي فقط", riskLevel: "high", affectedSystem: "Database", dataImpact: "schema", group: "code_deploy", maxApprovalType: "once" },
  { key: "create_backup", nameAr: "إنشاء نسخة احتياطية", descriptionAr: "نسخ احتياطي قبل عملية حساسة", riskLevel: "high", affectedSystem: "Database", dataImpact: "نسخ", group: "code_deploy", maxApprovalType: "once" },
  // Group 4 — Restaurant data
  { key: "read_restaurant_scoped", nameAr: "قراءة بيانات مطعم محدد", descriptionAr: "قراءة بيانات مطعم واحد فقط", riskLevel: "high", affectedSystem: "Restaurant", dataImpact: "قراءة", group: "restaurant_data", maxApprovalType: "once" },
  { key: "edit_restaurant_settings", nameAr: "تعديل إعدادات مطعم محدد", descriptionAr: "تعديل إعدادات مطعم واحد", riskLevel: "high", affectedSystem: "Restaurant", dataImpact: "تعديل", group: "restaurant_data", maxApprovalType: "once" },
  { key: "fix_restaurant_integration", nameAr: "إصلاح ربط مطعم محدد", descriptionAr: "إصلاح تكامل لمطعم", riskLevel: "high", affectedSystem: "Integrations", dataImpact: "تعديل ربط", group: "restaurant_data", maxApprovalType: "once" },
  { key: "edit_integration_status", nameAr: "تعديل حالة تكامل", descriptionAr: "تغيير حالة تكامل", riskLevel: "high", affectedSystem: "Integrations", dataImpact: "تعديل", group: "restaurant_data", maxApprovalType: "once" },
  { key: "create_qa_record", nameAr: "إنشاء سجل QA مؤقت", descriptionAr: "سجل اختبار مؤقت", riskLevel: "high", affectedSystem: "QA", dataImpact: "إضافة QA", group: "restaurant_data", maxApprovalType: "once" },
  { key: "archive_qa_record", nameAr: "أرشفة سجل QA", descriptionAr: "أرشفة soft فقط", riskLevel: "high", affectedSystem: "QA", dataImpact: "تحديث حالة", group: "restaurant_data", maxApprovalType: "once" },
  // Group 5 — Forbidden
  { key: "hard_delete_data", nameAr: "حذف نهائي للبيانات", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "All", dataImpact: "حذف", group: "forbidden", blocked: true },
  { key: "run_arbitrary_sql", nameAr: "تنفيذ SQL عشوائي", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Database", dataImpact: "حذف/تعديل", group: "forbidden", blocked: true },
  { key: "run_arbitrary_terminal", nameAr: "تنفيذ Terminal عشوائي", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Server", dataImpact: "غير محدود", group: "forbidden", blocked: true },
  { key: "expose_secrets", nameAr: "قراءة أو إظهار المفاتيح السرية", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Secrets", dataImpact: "تسريب", group: "forbidden", blocked: true },
  { key: "modify_bank_data", nameAr: "تعديل بيانات البنك", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Payments", dataImpact: "مالي", group: "forbidden", blocked: true },
  { key: "process_refund", nameAr: "استرداد أموال", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Payments", dataImpact: "مالي", group: "forbidden", blocked: true },
  { key: "change_owner", nameAr: "تغيير المالك", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Auth", dataImpact: "صلاحيات", group: "forbidden", blocked: true },
  { key: "delete_users", nameAr: "حذف المستخدمين", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Auth", dataImpact: "حذف", group: "forbidden", blocked: true },
  { key: "bypass_otp_captcha", nameAr: "تجاوز OTP أو CAPTCHA", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Auth", dataImpact: "أمان", group: "forbidden", blocked: true },
  { key: "auto_accept_legal", nameAr: "قبول اتفاقيات قانونية تلقائيًا", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Legal", dataImpact: "قانوني", group: "forbidden", blocked: true },
  { key: "change_passwords", nameAr: "تغيير كلمات المرور", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "Auth", dataImpact: "أمان", group: "forbidden", blocked: true },
  { key: "external_account_login", nameAr: "الدخول لحسابات خارجية", descriptionAr: "محظور", riskLevel: "blocked", affectedSystem: "External", dataImpact: "انتحال", group: "forbidden", blocked: true },
];

export const PRESETS = {
  monitoring_only: {
    labelAr: "وضع المراقبة فقط",
    descriptionAr: "صلاحيات القراءة والفحص فقط",
    keys: AI_ENGINEER_PERMISSIONS.filter((p) => p.group === "read_inspect").map((p) => p.key),
  },
  safe_repair: {
    labelAr: "وضع الإصلاح الآمن",
    descriptionAr: "قراءة + إصلاحات إعدادات بموافقة",
    keys: AI_ENGINEER_PERMISSIONS.filter((p) =>
      ["read_inspect", "config_repair"].includes(p.group)
    ).map((p) => p.key),
  },
  developer: {
    labelAr: "وضع المطور",
    descriptionAr: "قراءة + كود + staging — Production منفصل",
    keys: AI_ENGINEER_PERMISSIONS.filter(
      (p) =>
        ["read_inspect", "config_repair", "code_deploy"].includes(p.group) &&
        p.key !== "deploy_production" &&
        p.key !== "rollback" &&
        p.key !== "run_additive_migration"
    ).map((p) => p.key),
  },
  custom: {
    labelAr: "وضع مخصص",
    descriptionAr: "اختيار يدوي لكل صلاحية",
    keys: [] as string[],
  },
} as const;

export type PresetId = keyof typeof PRESETS;

export function getPermissionDef(key: string): PermissionDef | undefined {
  return AI_ENGINEER_PERMISSIONS.find((p) => p.key === key);
}

export function maxAllowedApprovalType(def: PermissionDef): ApprovalType {
  if (def.blocked) return "reject";
  if (def.riskLevel === "low" && def.allowPermanent) return "permanent";
  if (def.riskLevel === "medium") return def.maxApprovalType || "session";
  return "once";
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex");
}
