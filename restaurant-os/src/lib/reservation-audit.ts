import prisma from "@/lib/prisma";
import type { ReservationStatus } from "@prisma/client";

type StaffCtx = { userId?: string; userName?: string };

export async function recordReservationStatusChange(
  reservationId: string,
  previousStatus: ReservationStatus | null,
  newStatus: ReservationStatus,
  staff?: StaffCtx,
  note?: string
) {
  if (previousStatus === newStatus) return;
  await prisma.reservationStatusHistory.create({
    data: {
      reservationId,
      previousStatus,
      newStatus,
      changedByUserId: staff?.userId ?? null,
      note: note ?? null,
    },
  });
}

export async function logReservationAudit(
  restaurantId: string,
  reservationId: string,
  action: string,
  staff?: StaffCtx,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null
) {
  await prisma.reservationAuditLog.create({
    data: {
      restaurantId,
      reservationId,
      action,
      userId: staff?.userId ?? null,
      userName: staff?.userName ?? null,
      oldValues: (oldValues ?? undefined) as never,
      newValues: (newValues ?? undefined) as never,
    },
  });
}

export async function transitionReservationStatus(
  reservationId: string,
  restaurantId: string,
  newStatus: ReservationStatus,
  data: Record<string, unknown>,
  staff?: StaffCtx,
  auditAction?: string,
  note?: string
) {
  const existing = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId },
  });
  if (!existing) throw new Error("الحجز غير موجود");

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      ...data,
      status: newStatus,
      updatedByUserId: staff?.userId ?? existing.updatedByUserId,
    } as never,
  });

  await recordReservationStatusChange(
    reservationId,
    existing.status,
    newStatus,
    staff,
    note
  );

  if (auditAction) {
    await logReservationAudit(restaurantId, reservationId, auditAction, staff, {
      status: existing.status,
    }, { status: newStatus, ...data });
  }

  return updated;
}
