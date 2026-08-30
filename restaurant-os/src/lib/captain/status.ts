import type { OrderStatus } from "@prisma/client";

/** Valid captain/waiter order status transitions. */
export const CAPTAIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const CAPTAIN_STATUS_LABELS: Record<string, string> = {
  NEW: "طلب جديد",
  ACCEPTED: "تم استلام الطلب",
  CONFIRMED: "تم التأكيد",
  PREPARING: "جاري التجهيز",
  READY: "جاهز",
  SERVED: "تم التقديم",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export const CAPTAIN_CUSTOMER_STATUS_STEPS = [
  { status: "NEW", label: "تم إرسال طلبك إلى كابتن الصالة" },
  { status: "CONFIRMED", label: "تم تأكيد طلبك" },
  { status: "PREPARING", label: "جاري التجهيز" },
  { status: "READY", label: "طلبك جاهز" },
  { status: "SERVED", label: "تم تقديم الطلب" },
] as const;

/** Legacy orders may still be in ACCEPTED — treat as confirmed step in UI. */
export function captainCustomerStepIndex(status: OrderStatus): number {
  if (status === "ACCEPTED") return 1;
  const idx = CAPTAIN_CUSTOMER_STATUS_STEPS.findIndex((s) => s.status === status);
  if (idx >= 0) return idx;
  if (status === "COMPLETED") return CAPTAIN_CUSTOMER_STATUS_STEPS.length;
  return 0;
}

export function isCaptainOrderEditable(status: OrderStatus): boolean {
  return status === "NEW";
}

export function isCaptainOrderLocked(status: OrderStatus): boolean {
  return !isCaptainOrderEditable(status);
}

export function canTransitionCaptainStatus(from: OrderStatus, to: OrderStatus): boolean {
  return CAPTAIN_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function captainStatusTimestampField(
  status: OrderStatus
):
  | "acceptedAt"
  | "confirmedAt"
  | "preparingAt"
  | "readyAt"
  | "servedAt"
  | "cancelledAt"
  | "completedAt"
  | null {
  switch (status) {
    case "ACCEPTED":
      return "acceptedAt";
    case "CONFIRMED":
      return "confirmedAt";
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
  return ["NEW", "ACCEPTED", "CONFIRMED", "PREPARING", "READY"];
}

export function captainFilterStatuses(): { key: string; label: string; statuses: OrderStatus[] }[] {
  return [
    {
      key: "new",
      label: "طلبات جديدة",
      statuses: ["NEW"],
    },
    {
      key: "confirmed",
      label: "مؤكدة",
      statuses: ["CONFIRMED", "ACCEPTED"],
    },
    {
      key: "preparing",
      label: "قيد التجهيز",
      statuses: ["PREPARING"],
    },
    {
      key: "ready",
      label: "جاهزة",
      statuses: ["READY"],
    },
    {
      key: "done",
      label: "مكتملة",
      statuses: ["SERVED", "COMPLETED"],
    },
    {
      key: "all",
      label: "الكل",
      statuses: ["NEW", "CONFIRMED", "ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"],
    },
  ];
}

export function nextCaptainAction(status: OrderStatus): { next: OrderStatus; label: string } | null {
  switch (status) {
    case "CONFIRMED":
    case "ACCEPTED":
      return { next: "PREPARING", label: "جاري التجهيز" };
    case "PREPARING":
      return { next: "READY", label: "جاهز" };
    case "READY":
      return { next: "SERVED", label: "تم التقديم" };
    case "SERVED":
      return { next: "COMPLETED", label: "إكمال" };
    default:
      return null;
  }
}
