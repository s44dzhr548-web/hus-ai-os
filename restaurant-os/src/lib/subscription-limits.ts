import prisma from "@/lib/prisma";
import { SubscriptionPlan } from "@prisma/client";

export const TRIAL_DAYS = 14;
export const BILLING_CYCLE_DAYS = 30;

/** Map legacy BASIC to STARTER */
export function normalizePlan(plan: SubscriptionPlan | string): SubscriptionPlan {
  if (plan === "BASIC") return "STARTER";
  return plan as SubscriptionPlan;
}

export function isPaidPlan(plan: SubscriptionPlan | string): boolean {
  const p = normalizePlan(plan);
  return p !== "FREE" && p !== "ENTERPRISE";
}

export function planPrice(plan: SubscriptionPlan | string): number {
  const p = normalizePlan(plan);
  if (p === "ENTERPRISE") return 0;
  return PLAN_LIMITS[p]?.price ?? 0;
}

export function planDisplayPrice(plan: SubscriptionPlan | string): string {
  const p = normalizePlan(plan);
  if (p === "FREE") return "مجاني";
  if (p === "ENTERPRISE") return "مخصص";
  const price = planPrice(p);
  return `${price} ر.س/شهر`;
}

export const PLAN_LABELS: Record<string, string> = {
  FREE: "مجاني",
  BASIC: "Starter",
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export interface PlanLimits {
  branches: number;
  tables: number;
  categories: number;
  items: number;
  video: boolean;
  storageMb: number;
  whatsapp: boolean;
  analytics: boolean;
  cameraAnalytics: boolean;
  multiBranch: boolean;
  onlineOrdering: boolean;
  payments: boolean;
  customDomain: boolean;
  loyalty: boolean;
  kitchenScreen: boolean;
  reports: boolean;
  reception: boolean;
  label: string;
  price: number;
  features: string[];
}

export interface LimitOverrides {
  branches?: number;
  tables?: number;
  categories?: number;
  items?: number;
  video?: boolean;
  storageMb?: number;
  whatsapp?: boolean;
  analytics?: boolean;
  cameraAnalytics?: boolean;
  multiBranch?: boolean;
  onlineOrdering?: boolean;
  payments?: boolean;
  customDomain?: boolean;
  loyalty?: boolean;
  kitchenScreen?: boolean;
  reports?: boolean;
  reception?: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    branches: 1,
    tables: 5,
    categories: 5,
    items: 10,
    video: false,
    storageMb: 100,
    whatsapp: false,
    analytics: false,
    cameraAnalytics: false,
    multiBranch: false,
    onlineOrdering: true,
    payments: false,
    customDomain: false,
    loyalty: false,
    kitchenScreen: true,
    reports: false,
    reception: false,
    label: "مجاني",
    price: 0,
    features: [
      "تجربة 14 يوم بدون بطاقة",
      "فرع واحد · 5 طاولات",
      "5 تصنيفات · 10 منتجات",
      "طلب أونلاين + شاشة مطبخ",
    ],
  },
  BASIC: {
    branches: 1,
    tables: 50,
    categories: 20,
    items: 100,
    video: true,
    storageMb: 500,
    whatsapp: false,
    analytics: false,
    cameraAnalytics: false,
    multiBranch: false,
    onlineOrdering: true,
    payments: true,
    customDomain: false,
    loyalty: false,
    kitchenScreen: true,
    reports: false,
    reception: true,
    label: "Starter",
    price: 49,
    features: [
      "فرع واحد · 50 طاولة",
      "20 تصنيف · 100 منتج",
      "فيديو + مدفوعات + استقبال",
      "500 MB تخزين",
    ],
  },
  STARTER: {
    branches: 1,
    tables: 50,
    categories: 20,
    items: 100,
    video: true,
    storageMb: 500,
    whatsapp: false,
    analytics: false,
    cameraAnalytics: false,
    multiBranch: false,
    onlineOrdering: true,
    payments: true,
    customDomain: false,
    loyalty: false,
    kitchenScreen: true,
    reports: false,
    reception: true,
    label: "Starter",
    price: 49,
    features: [
      "فرع واحد · 50 طاولة",
      "20 تصنيف · 100 منتج",
      "فيديو + مدفوعات + استقبال",
      "500 MB تخزين",
    ],
  },
  PRO: {
    branches: 3,
    tables: 150,
    categories: 40,
    items: 500,
    video: true,
    storageMb: 2000,
    whatsapp: true,
    analytics: true,
    cameraAnalytics: false,
    multiBranch: true,
    onlineOrdering: true,
    payments: true,
    customDomain: false,
    loyalty: true,
    kitchenScreen: true,
    reports: true,
    reception: true,
    label: "Pro",
    price: 149,
    features: [
      "3 فروع · 150 طاولة",
      "40 تصنيف · 500 منتج",
      "واتساب + تحليلات + تقارير",
      "2 GB تخزين",
    ],
  },
  BUSINESS: {
    branches: 5,
    tables: 300,
    categories: 50,
    items: Infinity,
    video: true,
    storageMb: 5000,
    whatsapp: true,
    analytics: true,
    cameraAnalytics: false,
    multiBranch: true,
    onlineOrdering: true,
    payments: true,
    customDomain: true,
    loyalty: true,
    kitchenScreen: true,
    reports: true,
    reception: true,
    label: "Business",
    price: 299,
    features: [
      "5 فروع · 300 طاولة",
      "50 تصنيف · منتجات غير محدودة",
      "نطاق مخصص + ولاء",
      "5 GB تخزين",
    ],
  },
  ENTERPRISE: {
    branches: Infinity,
    tables: Infinity,
    categories: Infinity,
    items: Infinity,
    video: true,
    storageMb: Infinity,
    whatsapp: true,
    analytics: true,
    cameraAnalytics: true,
    multiBranch: true,
    onlineOrdering: true,
    payments: true,
    customDomain: true,
    loyalty: true,
    kitchenScreen: true,
    reports: true,
    reception: true,
    label: "Enterprise",
    price: 0,
    features: [
      "فروع وطاولات غير محدودة",
      "تحليلات الكاميرا",
      "تخزين غير محدود",
      "تسعير مخصص · دعم أولوية",
    ],
  },
};

export type LimitResource =
  | "branches"
  | "tables"
  | "categories"
  | "items"
  | "storageMb";

export type FeatureFlag =
  | "video"
  | "whatsapp"
  | "analytics"
  | "cameraAnalytics"
  | "multiBranch"
  | "onlineOrdering"
  | "payments"
  | "customDomain"
  | "loyalty"
  | "kitchenScreen"
  | "reports"
  | "reception";

export interface RestaurantUsage {
  branches: number;
  tables: number;
  categories: number;
  items: number;
  storageMb: number;
  plan: SubscriptionPlan;
  status: import("@prisma/client").SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  limitOverrides: LimitOverrides | null;
}

export interface EffectiveLimits extends Omit<PlanLimits, "label" | "price" | "features"> {
  label: string;
  price: number;
}

export interface PermissionResult {
  allowed: boolean;
  message?: string;
  code?: string;
  usage: RestaurantUsage;
  limits: EffectiveLimits;
}

function parseOverrides(raw: unknown): LimitOverrides | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as LimitOverrides;
}

export function getEffectiveLimits(
  plan: SubscriptionPlan,
  overrides?: LimitOverrides | null
): EffectiveLimits {
  const normalized = normalizePlan(plan);
  const base = PLAN_LIMITS[normalized] ?? PLAN_LIMITS.FREE;
  const o = overrides || {};
  return {
    branches: o.branches ?? base.branches,
    tables: o.tables ?? base.tables,
    categories: o.categories ?? base.categories,
    items: o.items ?? base.items,
    video: o.video ?? base.video,
    storageMb: o.storageMb ?? base.storageMb,
    whatsapp: o.whatsapp ?? base.whatsapp,
    analytics: o.analytics ?? base.analytics,
    cameraAnalytics: o.cameraAnalytics ?? base.cameraAnalytics,
    multiBranch: o.multiBranch ?? base.multiBranch,
    onlineOrdering: o.onlineOrdering ?? base.onlineOrdering,
    payments: o.payments ?? base.payments,
    customDomain: o.customDomain ?? base.customDomain,
    loyalty: o.loyalty ?? base.loyalty,
    kitchenScreen: o.kitchenScreen ?? base.kitchenScreen,
    reports: o.reports ?? base.reports,
    reception: o.reception ?? base.reception,
    label: base.label,
    price: base.price,
  };
}

export async function getRestaurantUsage(
  restaurantId: string
): Promise<RestaurantUsage> {
  const [subscription, branches, categories, items] = await Promise.all([
    prisma.subscription.findUnique({ where: { restaurantId } }),
    prisma.branch.count({ where: { restaurantId } }),
    prisma.menuCategory.count({ where: { restaurantId } }),
    prisma.menuItem.count({ where: { category: { restaurantId } } }),
  ]);

  const tables = await prisma.diningTable.count({
    where: { branch: { restaurantId } },
  });

  const plan = normalizePlan(subscription?.plan ?? "FREE");

  return {
    branches,
    tables,
    categories,
    items,
    storageMb: 0,
    plan,
    status: subscription?.status ?? "TRIAL",
    startDate: subscription?.startDate ?? new Date(),
    endDate: subscription?.endDate ?? null,
    limitOverrides: parseOverrides(subscription?.limitOverrides),
  };
}

export function isSubscriptionActive(status: import("@prisma/client").SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL";
}

export function subscriptionStatusMessage(status: import("@prisma/client").SubscriptionStatus): string {
  if (status === "PAST_DUE") return "الاشتراك متأخر الدفع. يرجى تجديد الاشتراك.";
  if (status === "EXPIRED") return "انتهى اشتراكك. يرجى التجديد للمتابعة.";
  if (status === "SUSPENDED") return "تم تعليق حسابك. تواصل مع الدعم.";
  if (status === "CANCELLED") return "تم إلغاء الاشتراك.";
  return "الاشتراك غير نشط.";
}

const LIMIT_MESSAGES: Record<LimitResource, string> = {
  branches: "تم الوصول إلى الحد الأقصى للفروع",
  tables: "تم الوصول إلى الحد الأقصى للطاولات",
  categories: "تم الوصول إلى الحد الأقصى للتصنيفات",
  items: "تم الوصول إلى الحد الأقصى للمنتجات",
  storageMb: "تم الوصول إلى الحد الأقصى للتخزين",
};

const FEATURE_MESSAGES: Record<FeatureFlag, string> = {
  video: "ميزة الفيديو غير متاحة في باقتك الحالية",
  whatsapp: "ميزة واتساب غير متاحة في باقتك الحالية",
  analytics: "التحليلات غير متاحة في باقتك الحالية",
  cameraAnalytics: "تحليلات الكاميرا غير متاحة في باقتك الحالية",
  multiBranch: "الفروع المتعددة غير متاحة في باقتك الحالية",
  onlineOrdering: "الطلب أونلاين غير متاح في باقتك الحالية",
  payments: "المدفوعات غير متاحة في باقتك الحالية",
  customDomain: "النطاق المخصص غير متاح في باقتك الحالية",
  loyalty: "برنامج الولاء غير متاح في باقتك الحالية",
  kitchenScreen: "شاشة المطبخ غير متاحة في bاقتك الحالية",
  reports: "التقارير غير متاحة في باقتك الحالية",
  reception: "ميزة الاستقبال والحجوزات غير متاحة في باقتك الحالية",
};

export async function checkFeature(
  restaurantId: string,
  feature: FeatureFlag
): Promise<PermissionResult> {
  const usage = await getRestaurantUsage(restaurantId);
  const limits = getEffectiveLimits(usage.plan, usage.limitOverrides);

  if (!isSubscriptionActive(usage.status)) {
    return {
      allowed: false,
      message: subscriptionStatusMessage(usage.status),
      code: "SUBSCRIPTION_INACTIVE",
      usage,
      limits,
    };
  }

  if (usage.endDate && usage.endDate < new Date()) {
    return {
      allowed: false,
      message: "انتهى اشتراكك. يرجى التجديد للمتابعة.",
      code: "SUBSCRIPTION_EXPIRED",
      usage,
      limits,
    };
  }

  const enabled = limits[feature];
  if (!enabled) {
    return {
      allowed: false,
      message: FEATURE_MESSAGES[feature],
      code: `FEATURE_${feature.toUpperCase()}_DISABLED`,
      usage,
      limits,
    };
  }

  return { allowed: true, usage, limits };
}

export async function checkLimit(
  restaurantId: string,
  resource: LimitResource,
  increment = 1
): Promise<PermissionResult> {
  const usage = await getRestaurantUsage(restaurantId);
  const limits = getEffectiveLimits(usage.plan, usage.limitOverrides);

  if (!isSubscriptionActive(usage.status)) {
    return {
      allowed: false,
      message: subscriptionStatusMessage(usage.status),
      code: "SUBSCRIPTION_INACTIVE",
      usage,
      limits,
    };
  }

  if (usage.endDate && usage.endDate < new Date()) {
    return {
      allowed: false,
      message: "انتهى اشتراكك. يرجى التجديد للمتابعة.",
      code: "SUBSCRIPTION_EXPIRED",
      usage,
      limits,
    };
  }

  const cap = limits[resource];
  const current = usage[resource];
  if (cap !== Infinity && current + increment > cap) {
    return {
      allowed: false,
      message: LIMIT_MESSAGES[resource],
      code: `LIMIT_${resource.toUpperCase()}`,
      usage,
      limits,
    };
  }

  return { allowed: true, usage, limits };
}

export async function checkPermission(
  restaurantId: string,
  check:
    | { type: "limit"; resource: LimitResource; increment?: number }
    | { type: "feature"; feature: FeatureFlag }
): Promise<PermissionResult> {
  if (check.type === "feature") {
    return checkFeature(restaurantId, check.feature);
  }
  return checkLimit(restaurantId, check.resource, check.increment ?? 1);
}

export function planList() {
  const ids: SubscriptionPlan[] = ["FREE", "STARTER", "PRO", "BUSINESS", "ENTERPRISE"];
  return ids.map((id) => ({
    id,
    ...PLAN_LIMITS[id],
  }));
}

export function serializeLimits(limits: EffectiveLimits) {
  return {
    branches: limits.branches === Infinity ? null : limits.branches,
    tables: limits.tables === Infinity ? null : limits.tables,
    categories: limits.categories === Infinity ? null : limits.categories,
    items: limits.items === Infinity ? null : limits.items,
    storageMb: limits.storageMb === Infinity ? null : limits.storageMb,
    video: limits.video,
    whatsapp: limits.whatsapp,
    analytics: limits.analytics,
    cameraAnalytics: limits.cameraAnalytics,
    multiBranch: limits.multiBranch,
    onlineOrdering: limits.onlineOrdering,
    payments: limits.payments,
    customDomain: limits.customDomain,
    loyalty: limits.loyalty,
    kitchenScreen: limits.kitchenScreen,
    reports: limits.reports,
    reception: limits.reception,
  };
}

export function remainingLimits(usage: RestaurantUsage, limits: EffectiveLimits) {
  const remaining = (used: number, cap: number) =>
    cap === Infinity ? null : Math.max(0, cap - used);

  return {
    branches: remaining(usage.branches, limits.branches),
    tables: remaining(usage.tables, limits.tables),
    categories: remaining(usage.categories, limits.categories),
    items: remaining(usage.items, limits.items),
    storageMb: remaining(usage.storageMb, limits.storageMb),
  };
}

export const PLAN_ORDER: SubscriptionPlan[] = [
  "FREE",
  "STARTER",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
];

export function comparePlans(a: SubscriptionPlan, b: SubscriptionPlan): number {
  return PLAN_ORDER.indexOf(normalizePlan(a)) - PLAN_ORDER.indexOf(normalizePlan(b));
}

export const CHECKOUT_PLANS: SubscriptionPlan[] = ["STARTER", "PRO", "BUSINESS"];
