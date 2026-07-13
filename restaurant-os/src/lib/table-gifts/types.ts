export type TableGiftSettings = {
  enabled: boolean;
  acceptanceTimeoutMinutes: number;
  allowAnonymous: boolean;
  showSenderName: boolean;
};

export const DEFAULT_TABLE_GIFT_SETTINGS: TableGiftSettings = {
  enabled: false,
  acceptanceTimeoutMinutes: 2,
  allowAnonymous: true,
  showSenderName: true,
};

export function parseTableGiftSettings(
  enabled: boolean,
  raw: unknown
): TableGiftSettings {
  const base = { ...DEFAULT_TABLE_GIFT_SETTINGS, enabled };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    enabled,
    acceptanceTimeoutMinutes:
      typeof o.acceptanceTimeoutMinutes === "number"
        ? Math.max(1, Math.min(30, o.acceptanceTimeoutMinutes))
        : base.acceptanceTimeoutMinutes,
    allowAnonymous: o.allowAnonymous !== false,
    showSenderName: o.showSenderName !== false,
  };
}

export const GIFT_STATUS_LABELS_AR: Record<string, string> = {
  PENDING_ACCEPTANCE: "بانتظار القبول",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  EXPIRED: "منتهي",
  PAYMENT_PENDING: "بانتظار الدفع",
  PAID: "مدفوع",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغى",
  REFUNDED: "مسترد",
};

export const GIFT_STATUS_LABELS_EN: Record<string, string> = {
  PENDING_ACCEPTANCE: "Pending acceptance",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  PAYMENT_PENDING: "Awaiting payment",
  PAID: "Paid",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
