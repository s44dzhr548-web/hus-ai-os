import { SubscriptionStatus } from "@prisma/client";

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "نشط",
  TRIAL: "تجريبي",
  PAST_DUE: "متأخر",
  CANCELLED: "ملغي",
  EXPIRED: "منتهي",
  SUSPENDED: "معلق",
};

export const PLAN_LABELS: Record<string, string> = {
  FREE: "مجاني",
  BASIC: "Starter",
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export function subscriptionExpiryInfo(endDate: Date | string | null | undefined) {
  if (!endDate) {
    return { daysRemaining: null, isExpired: false, label: "بدون تاريخ انتهاء" };
  }
  const end = new Date(endDate);
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(ms / (24 * 60 * 60 * 1000));
  const isExpired = ms < 0;
  return {
    daysRemaining: isExpired ? 0 : daysRemaining,
    isExpired,
    label: isExpired
      ? "منتهي"
      : daysRemaining === 0
        ? "ينتهي اليوم"
        : `${daysRemaining} يوم متبقي`,
  };
}

export function statusBadgeVariant(
  status: SubscriptionStatus,
  isExpired: boolean
): "success" | "warning" | "danger" | "default" {
  if (isExpired || status === "EXPIRED" || status === "SUSPENDED") return "danger";
  if (status === "TRIAL") return "warning";
  if (status === "ACTIVE") return "success";
  return "default";
}
