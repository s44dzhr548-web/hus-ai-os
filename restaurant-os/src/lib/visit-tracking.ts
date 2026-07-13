import type { TableSessionStatus, VisitStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { computeDurationMinutes, visitDateFromUtc } from "@/lib/timezone";
import { recordStaffAuditEvent, type StaffAuditContext } from "@/lib/staff-audit-event";

const SESSION_START_STATUSES: TableSessionStatus[] = [
  "ORDERING",
  "FOOD_PREPARING",
  "SERVING",
  "PAID",
];

export function mapSessionStatusToVisitStatus(
  sessionStatus: TableSessionStatus,
  current?: VisitStatus
): VisitStatus {
  if (sessionStatus === "COMPLETED") return "COMPLETED";
  if (sessionStatus === "WAITING") return "WAITING";
  if (sessionStatus === "SEATED") return "SEATED";
  if (SESSION_START_STATUSES.includes(sessionStatus)) return "ACTIVE";
  return current ?? "ACTIVE";
}

export function isSessionStartedStatus(status: TableSessionStatus) {
  return SESSION_START_STATUSES.includes(status);
}

export type VisitStaff = {
  userId?: string | null;
  name?: string | null;
};

export async function onCustomerRegistered(params: {
  visitId: string;
  restaurantId: string;
  branchId: string;
  tableId: string;
  tableDisplayNumber: string;
  customerProfileId: string;
  sessionStatus: TableSessionStatus;
  staff: VisitStaff;
  audit?: Partial<StaffAuditContext>;
}) {
  const now = new Date();
  const isWaiting = params.sessionStatus === "WAITING";
  const isSeated = !isWaiting;

  await prisma.customerVisit.update({
    where: { id: params.visitId },
    data: {
      enteredAt: now,
      registeredAt: now,
      visitDate: visitDateFromUtc(now),
      tableId: params.tableId,
      branchId: params.branchId,
      source: "reception",
      registeredByUserId: params.staff.userId ?? null,
      ...(isSeated
        ? {
            seatedAt: now,
            assignedByUserId: params.staff.userId ?? null,
            visitStatus: "SEATED" as VisitStatus,
          }
        : { visitStatus: "WAITING" as VisitStatus }),
      arrivalTime: now,
    },
  });

  await recordStaffAuditEvent("CUSTOMER_REGISTERED", {
    restaurantId: params.restaurantId,
    branchId: params.branchId,
    staffUserId: params.staff.userId,
    staffName: params.staff.name,
    customerProfileId: params.customerProfileId,
    customerVisitId: params.visitId,
    tableId: params.tableId,
    newValue: { tableDisplayNumber: params.tableDisplayNumber },
    ...params.audit,
  });

  if (isSeated) {
    await recordStaffAuditEvent("TABLE_ASSIGNED", {
      restaurantId: params.restaurantId,
      branchId: params.branchId,
      staffUserId: params.staff.userId,
      staffName: params.staff.name,
      customerVisitId: params.visitId,
      tableId: params.tableId,
      newValue: params.tableDisplayNumber,
      ...params.audit,
    });
  }
}

export async function onTableAssigned(params: {
  visitId: string;
  restaurantId: string;
  branchId?: string | null;
  tableId: string;
  tableDisplayNumber: string;
  staff: VisitStaff;
  previousTableId?: string | null;
  audit?: Partial<StaffAuditContext>;
}) {
  const now = new Date();
  const action = params.previousTableId ? "TABLE_CHANGED" : "TABLE_ASSIGNED";

  await prisma.customerVisit.update({
    where: { id: params.visitId },
    data: {
      seatedAt: now,
      assignedByUserId: params.staff.userId ?? null,
      tableId: params.tableId,
      visitStatus: "SEATED",
    },
  });

  await recordStaffAuditEvent(action, {
    restaurantId: params.restaurantId,
    branchId: params.branchId,
    staffUserId: params.staff.userId,
    staffName: params.staff.name,
    customerVisitId: params.visitId,
    tableId: params.tableId,
    previousValue: params.previousTableId,
    newValue: params.tableDisplayNumber,
    ...params.audit,
  });
}

export async function onSessionStarted(params: {
  visitId: string;
  restaurantId: string;
  branchId?: string | null;
  sessionId: string;
  staff: VisitStaff;
  audit?: Partial<StaffAuditContext>;
}) {
  const now = new Date();
  const visit = await prisma.customerVisit.findUnique({ where: { id: params.visitId } });
  if (visit?.sessionStartedAt) return;

  await prisma.customerVisit.update({
    where: { id: params.visitId },
    data: {
      sessionStartedAt: now,
      startedByUserId: params.staff.userId ?? null,
      visitStatus: "ACTIVE",
    },
  });

  await recordStaffAuditEvent("SESSION_STARTED", {
    restaurantId: params.restaurantId,
    branchId: params.branchId,
    staffUserId: params.staff.userId,
    staffName: params.staff.name,
    customerVisitId: params.visitId,
    sessionId: params.sessionId,
    ...params.audit,
  });
}

export async function onCustomerUpdated(params: {
  visitId?: string | null;
  customerProfileId?: string | null;
  restaurantId: string;
  staff: VisitStaff;
  changes: { field: string; oldValue: unknown; newValue: unknown }[];
  audit?: Partial<StaffAuditContext>;
}) {
  await recordStaffAuditEvent("CUSTOMER_UPDATED", {
    restaurantId: params.restaurantId,
    staffUserId: params.staff.userId,
    staffName: params.staff.name,
    customerProfileId: params.customerProfileId,
    customerVisitId: params.visitId,
    previousValue: params.changes.map((c) => ({ [c.field]: c.oldValue })),
    newValue: params.changes.map((c) => ({ [c.field]: c.newValue })),
    ...params.audit,
  });
}

export async function onSessionCompleted(params: {
  visitId: string;
  restaurantId: string;
  branchId?: string | null;
  sessionId: string;
  sessionStartedAt: Date;
  staff: VisitStaff;
  audit?: Partial<StaffAuditContext>;
}) {
  const now = new Date();
  const duration = computeDurationMinutes(params.sessionStartedAt, now);

  await prisma.customerVisit.update({
    where: { id: params.visitId },
    data: {
      sessionEndedAt: now,
      exitedAt: now,
      endTime: now,
      closedByUserId: params.staff.userId ?? null,
      closedByStaffName: params.staff.name ?? undefined,
      sessionDurationMinutes: duration,
      visitStatus: "COMPLETED",
    },
  });

  await recordStaffAuditEvent("SESSION_COMPLETED", {
    restaurantId: params.restaurantId,
    branchId: params.branchId,
    staffUserId: params.staff.userId,
    staffName: params.staff.name,
    customerVisitId: params.visitId,
    sessionId: params.sessionId,
    newValue: { durationMinutes: duration },
    ...params.audit,
  });
}

export async function onSessionStatusChange(params: {
  visitId: string;
  restaurantId: string;
  branchId?: string | null;
  sessionId: string;
  oldStatus: TableSessionStatus;
  newStatus: TableSessionStatus;
  staff: VisitStaff;
  audit?: Partial<StaffAuditContext>;
}) {
  if (
    !isSessionStartedStatus(params.oldStatus) &&
    isSessionStartedStatus(params.newStatus)
  ) {
    await onSessionStarted({
      visitId: params.visitId,
      restaurantId: params.restaurantId,
      branchId: params.branchId,
      sessionId: params.sessionId,
      staff: params.staff,
      audit: params.audit,
    });
  }

  const visitStatus = mapSessionStatusToVisitStatus(params.newStatus);
  await prisma.customerVisit.update({
    where: { id: params.visitId },
    data: { visitStatus },
  });

  await recordStaffAuditEvent("SESSION_UPDATED", {
    restaurantId: params.restaurantId,
    branchId: params.branchId,
    staffUserId: params.staff.userId,
    staffName: params.staff.name,
    customerVisitId: params.visitId,
    sessionId: params.sessionId,
    previousValue: params.oldStatus,
    newValue: params.newStatus,
    ...params.audit,
  });
}
