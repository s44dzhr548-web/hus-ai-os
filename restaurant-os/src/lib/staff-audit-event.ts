import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

export const STAFF_AUDIT_ACTIONS = [
  "CUSTOMER_REGISTERED",
  "CUSTOMER_UPDATED",
  "RESERVATION_CREATED",
  "RESERVATION_UPDATED",
  "TABLE_ASSIGNED",
  "TABLE_CHANGED",
  "SESSION_STARTED",
  "SESSION_UPDATED",
  "SESSION_COMPLETED",
  "SESSION_REOPENED",
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "ORDER_CANCELLED",
  "TABLE_CREATED",
  "TABLE_EDITED",
  "TABLE_ARCHIVED",
  "TABLE_RESTORED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
] as const;

export type StaffAuditAction = (typeof STAFF_AUDIT_ACTIONS)[number];

export type StaffAuditContext = {
  restaurantId: string;
  branchId?: string | null;
  staffUserId?: string | null;
  staffName?: string | null;
  customerProfileId?: string | null;
  customerVisitId?: string | null;
  reservationId?: string | null;
  sessionId?: string | null;
  orderId?: string | null;
  tableId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  result?: "success" | "failed";
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: object;
};

function serializeValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Immutable audit row — insert only, never update/delete from app code */
export async function recordStaffAuditEvent(
  action: StaffAuditAction,
  ctx: StaffAuditContext
) {
  try {
    await prisma.staffAuditEvent.create({
      data: {
        id: randomUUID(),
        restaurantId: ctx.restaurantId,
        branchId: ctx.branchId ?? null,
        staffUserId: ctx.staffUserId ?? null,
        staffName: ctx.staffName ?? null,
        customerProfileId: ctx.customerProfileId ?? null,
        customerVisitId: ctx.customerVisitId ?? null,
        reservationId: ctx.reservationId ?? null,
        sessionId: ctx.sessionId ?? null,
        orderId: ctx.orderId ?? null,
        tableId: ctx.tableId ?? null,
        action,
        previousValue: serializeValue(ctx.previousValue),
        newValue: serializeValue(ctx.newValue),
        result: ctx.result ?? "success",
        requestId: ctx.requestId ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: ctx.metadata ?? undefined,
      },
    });
  } catch (e) {
    console.error("[staff-audit-event]", action, e);
  }
}

export const AUDIT_ACTION_LABELS_AR: Record<string, string> = {
  CUSTOMER_REGISTERED: "تسجيل عميل",
  CUSTOMER_UPDATED: "تعديل بيانات عميل",
  RESERVATION_CREATED: "إنشاء حجز",
  RESERVATION_UPDATED: "تعديل حجز",
  TABLE_ASSIGNED: "تعيين طاولة",
  TABLE_CHANGED: "تغيير طاولة",
  SESSION_STARTED: "بدء الجلسة",
  SESSION_UPDATED: "تحديث الجلسة",
  SESSION_COMPLETED: "إنهاء الجلسة",
  SESSION_REOPENED: "إعادة فتح الجلسة",
  ORDER_CREATED: "إنشاء طلب",
  ORDER_UPDATED: "تعديل طلب",
  ORDER_CANCELLED: "إلغاء طلب",
  TABLE_CREATED: "إنشاء طاولة",
  TABLE_EDITED: "تعديل طاولة",
  TABLE_ARCHIVED: "أرشفة طاولة",
  TABLE_RESTORED: "استعادة طاولة",
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILED: "فشل تسجيل الدخول",
  LOGOUT: "تسجيل خروج",
};
