import {
  getEffectiveLimits,
  PLAN_LIMITS,
  type EffectiveLimits,
  type LimitOverrides,
  type LimitResource,
  type FeatureFlag,
} from "@/lib/subscription-limits";
import { SubscriptionPlan } from "@prisma/client";

export type PermissionLimitKey = LimitResource;
export type PermissionFeatureKey = FeatureFlag;
export type PermissionKey = PermissionLimitKey | PermissionFeatureKey;

export const LIMIT_FIELDS: {
  key: PermissionLimitKey;
  label: string;
  unit: string;
}[] = [
  { key: "branches", label: "حد الفروع", unit: "فرع" },
  { key: "tables", label: "حد الطاولات", unit: "طاولة" },
  { key: "categories", label: "حد التصنيفات", unit: "تصنيف" },
  { key: "items", label: "حد المنتجات", unit: "منتج" },
  { key: "storageMb", label: "حد التخزين", unit: "MB" },
];

export const FEATURE_FIELDS: {
  key: PermissionFeatureKey;
  label: string;
}[] = [
  { key: "video", label: "رفع فيديو" },
  { key: "whatsapp", label: "واتساب" },
  { key: "analytics", label: "التحليلات" },
  { key: "cameraAnalytics", label: "تحليلات الكاميرا (AI)" },
  { key: "multiBranch", label: "فروع متعددة" },
  { key: "onlineOrdering", label: "الطلب أونلاين" },
  { key: "payments", label: "المدفوعات" },
  { key: "customDomain", label: "نطاق مخصص" },
  { key: "loyalty", label: "برنامج الولاء" },
  { key: "kitchenScreen", label: "شاشة المطبخ" },
  { key: "reports", label: "التقارير" },
  { key: "reception", label: "الاستقبال والحجوزات" },
];

export const PERMISSION_FIELD_LABELS: Record<PermissionKey, string> = {
  branches: "حد الفروع",
  tables: "حد الطاولات",
  categories: "حد التصنيفات",
  items: "حد المنتجات",
  storageMb: "حد التخزين",
  video: "رفع فيديو",
  whatsapp: "واتساب",
  analytics: "التحليلات",
  cameraAnalytics: "تحليلات الكاميرا (AI)",
  multiBranch: "فروع متعددة",
  onlineOrdering: "الطلب أونلاين",
  payments: "المدفوعات",
  customDomain: "نطاق مخصص",
  loyalty: "برنامج الولاء",
  kitchenScreen: "شاشة المطبخ",
  reports: "التقارير",
  reception: "الاستقبال والحجوزات",
};

export interface PermissionChange {
  field: PermissionKey;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
}

const ALL_KEYS: PermissionKey[] = [
  ...LIMIT_FIELDS.map((f) => f.key),
  ...FEATURE_FIELDS.map((f) => f.key),
];

export function formatPermissionValue(
  key: PermissionKey,
  value: unknown
): string {
  if (value === Infinity || value === null) return "∞";
  if (typeof value === "boolean") return value ? "مفعّل" : "معطّل";
  if (key === "storageMb" && typeof value === "number") return `${value} MB`;
  return String(value);
}

function diffEffective(
  oldEffective: EffectiveLimits,
  newEffective: EffectiveLimits
): PermissionChange[] {
  const changes: PermissionChange[] = [];
  for (const key of ALL_KEYS) {
    const oldValue = oldEffective[key];
    const newValue = newEffective[key];
    if (oldValue !== newValue) {
      changes.push({
        field: key,
        fieldLabel: PERMISSION_FIELD_LABELS[key],
        oldValue,
        newValue,
      });
    }
  }
  return changes;
}

function stripPlanDefaults(
  plan: SubscriptionPlan,
  overrides: LimitOverrides
): LimitOverrides | null {
  const planDefaults = getEffectiveLimits(plan, null);
  const cleaned: LimitOverrides = {};

  for (const key of ALL_KEYS) {
    const value = overrides[key as keyof LimitOverrides];
    if (value === undefined) continue;
    if (value !== planDefaults[key as keyof EffectiveLimits]) {
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function diffPermissionOverrides(
  plan: SubscriptionPlan,
  currentOverrides: LimitOverrides | null,
  newOverrides: LimitOverrides | null
): PermissionChange[] {
  const oldEffective = getEffectiveLimits(plan, currentOverrides);
  const newEffective = getEffectiveLimits(plan, newOverrides);
  return diffEffective(oldEffective, newEffective);
}

export function buildOverridesFromForm(
  plan: SubscriptionPlan,
  limits: Record<string, string>,
  features: Record<string, boolean>
): LimitOverrides | null {
  const planDefaults = getEffectiveLimits(plan, null);
  const result: LimitOverrides = {};

  for (const { key } of LIMIT_FIELDS) {
    const raw = limits[key]?.trim() ?? "";
    const value =
      raw === "" ? (planDefaults[key] as number) : parseInt(raw, 10);
    if (!Number.isNaN(value) && value !== planDefaults[key]) {
      (result as Record<string, number>)[key] = value;
    }
  }

  for (const { key } of FEATURE_FIELDS) {
    const value = features[key];
    if (value !== planDefaults[key]) {
      (result as Record<string, boolean>)[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function applyPermissionValues(
  plan: SubscriptionPlan,
  currentOverrides: LimitOverrides | null,
  values: Partial<LimitOverrides>
): { overrides: LimitOverrides | null; changes: PermissionChange[] } {
  const oldEffective = getEffectiveLimits(plan, currentOverrides);
  const overrides = stripPlanDefaults(plan, values as LimitOverrides);
  const newEffective = getEffectiveLimits(plan, overrides);
  const changes = diffEffective(oldEffective, newEffective);
  return { overrides, changes };
}

export function mergePermissionPatch(
  plan: SubscriptionPlan,
  currentOverrides: LimitOverrides | null,
  patch: Partial<LimitOverrides>
): { overrides: LimitOverrides | null; changes: PermissionChange[] } {
  const oldEffective = getEffectiveLimits(plan, currentOverrides);
  const merged: LimitOverrides = { ...(currentOverrides || {}), ...patch };
  const overrides = stripPlanDefaults(plan, merged);
  const newEffective = getEffectiveLimits(plan, overrides);
  const changes = diffEffective(oldEffective, newEffective);

  return { overrides, changes };
}

export function resetPermissionOverrides(
  plan: SubscriptionPlan,
  currentOverrides: LimitOverrides | null
): { overrides: null; changes: PermissionChange[] } {
  const oldEffective = getEffectiveLimits(plan, currentOverrides);
  const newEffective = getEffectiveLimits(plan, null);
  const changes = diffEffective(oldEffective, newEffective);

  return { overrides: null, changes };
}

export function planLabel(plan: SubscriptionPlan): string {
  return PLAN_LIMITS[plan].label;
}
