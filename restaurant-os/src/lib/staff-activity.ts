import prisma from "@/lib/prisma";
import { recordStaffAuditEvent } from "@/lib/staff-audit-event";

export type StaffActivityAction = "LOGIN" | "LOGOUT" | "LOGIN_FAILED";

export async function logStaffActivity(params: {
  restaurantId: string;
  userId: string;
  action: StaffActivityAction;
  staffName?: string | null;
  metadata?: object;
  ipAddress?: string | null;
  userAgent?: string | null;
  loginSuccess?: boolean;
  failureReason?: string | null;
  endReason?: string | null;
  sessionDurationMinutes?: number | null;
}) {
  try {
    const staff = await prisma.staff.findFirst({
      where: { userId: params.userId, restaurantId: params.restaurantId, isActive: true },
      select: { id: true, name: true },
    });

    await prisma.staffActivityLog.create({
      data: {
        restaurantId: params.restaurantId,
        userId: params.userId,
        staffId: staff?.id ?? null,
        staffName: params.staffName ?? staff?.name ?? null,
        action: params.action,
        metadata: params.metadata ?? undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        loginSuccess: params.loginSuccess ?? params.action !== "LOGIN_FAILED",
        failureReason: params.failureReason ?? null,
        endReason: params.endReason ?? null,
        sessionDurationMinutes: params.sessionDurationMinutes ?? null,
      },
    });

    const auditAction =
      params.action === "LOGIN"
        ? "LOGIN_SUCCESS"
        : params.action === "LOGIN_FAILED"
          ? "LOGIN_FAILED"
          : "LOGOUT";

    await recordStaffAuditEvent(auditAction, {
      restaurantId: params.restaurantId,
      staffUserId: params.userId,
      staffName: params.staffName ?? staff?.name,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: params.loginSuccess === false ? "failed" : "success",
      newValue: params.failureReason ?? params.endReason,
      metadata: params.metadata,
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: params.restaurantId,
        userId: params.userId,
        action: params.action === "LOGIN" ? "STAFF_LOGIN" : params.action === "LOGOUT" ? "STAFF_LOGOUT" : "STAFF_LOGIN_FAILED",
        entity: "StaffActivity",
        metadata: { staffName: params.staffName ?? staff?.name },
      },
    });
  } catch (e) {
    console.error("[staff-activity]", e);
  }
}

export async function getStaffLoginHistory(
  restaurantId: string,
  opts?: { limit?: number; from?: Date; to?: Date }
) {
  const where = {
    restaurantId,
    action: { in: ["LOGIN", "LOGOUT"] },
    ...(opts?.from || opts?.to
      ? {
          createdAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
  };

  return prisma.staffActivityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 200,
  });
}
