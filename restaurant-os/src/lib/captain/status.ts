import type { OrderStatus } from "@prisma/client";

/** Valid captain order status transitions (no duplicate actions). */
export const CAPTAIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export const CAPTAIN_STATUS_LABELS: Record<string, string> = {
  NEW: "طلب جديد",
  ACCEPTED: "تم استلام الطلب",
  PREPARING: "جاري التجهيز",
  READY: "جاهز",
  SERVED: "تم التقديم",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export const CAPTAIN_CUSTOMER_STATUS_STEPS = [
  { status: "NEW", label: "تم إرسال طلبك إلى كابتن الصالة" },
  { status: "ACCEPTED", label: "تم استلام طلبك" },
  { status: "PREPARING", label: "جاري التجهيز" },
  { status: "READY", label: "طلبك جاهز" },
  { status: "SERVED", label: "تم تقديم الطلب" },
] as const;

export function canTransitionCaptainStatus(from: OrderStatus, to: OrderStatus): boolean {
  return CAPTAIN_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function captainStatusTimestampField(
  status: OrderStatus
): "acceptedAt" | "preparingAt" | "readyAt" | "servedAt" | "cancelledAt" | "completedAt" | null {
  switch (status) {
    case "ACCEPTED":
      return "acceptedAt";
    case "PREPARING":
      return "preparingAt";
    case "READY":
      return "readyAt";
    case "SERVED":
      return "servedAt";
    case "CANCELLED":
      return "cancelledAt";
    case "COMPLETED":
      return "completedAt";
    default:
      return null;
  }
}

export function captainActiveStatuses(): OrderStatus[] {
  return ["NEW", "ACCEPTED", "PREPARING", "READY"];
}

export function captainFilterStatuses(): { key: string; label: string; statuses: OrderStatus[] }[] {
  return [
    { key: "all", label: "الكل", statuses: ["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "CANCELLED"] },
    { key: "new", label: "جديد", statuses: ["NEW"] },
    { key: "accepted", label: "تم الاستلام", statuses: ["ACCEPTED"] },
    { key: "preparing", label: "جاري التجهيز", statuses: ["PREPARING"] },
    { key: "ready", label: "جاهز", statuses: ["READY"] },
    { key: "served", label: "تم التقديم", statuses: ["SERVED"] },
  ];
}

export function nextCaptainAction(status: OrderStatus): { next: OrderStatus; label: string } | null {
  switch (status) {
    case "NEW":
      return { next: "ACCEPTED", label: "استلام الطلب" };
    case "ACCEPTED":
      return { next: "PREPARING", label: "جاري التجهيز" };
    case "PREPARING":
      return { next: "READY", label: "جاهز" };
    case "READY":
      return { next: "SERVED", label: "تم التقديم" };
    default:
      return null;
  }
}
