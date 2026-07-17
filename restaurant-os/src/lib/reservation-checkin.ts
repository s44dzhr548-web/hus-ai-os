import prisma from "@/lib/prisma";
import type { DiningTable, Reservation, ReservationStatus, Prisma } from "@prisma/client";
import {
  isActiveSession,
  serializeTableSession,
  serializeReservation,
  upsertCustomerProfile,
  syncTableOperationalStatus,
} from "@/lib/reception";
import { effectiveMinimumSpend } from "@/lib/table-meta";
import { displayTableNumber } from "@/lib/table-number-normalize";
import { onCustomerRegistered } from "@/lib/visit-tracking";
import { requestMeta } from "@/lib/request-meta";
import { recordReservationStatusChange } from "@/lib/reservation-audit";
import type { NextRequest } from "next/server";

type StaffCtx = { userId?: string; userName?: string };

function tableSnapshot(table: DiningTable) {
  const display = displayTableNumber(table.displayNumber || table.label || table.number);
  return {
    tableId: table.id,
    tableNumber: table.number,
    tableNumberSnapshot: display,
    tableLabel: table.label,
    tableIcon: table.tableIcon,
    tableZone: table.floorZone,
    branchId: table.branchId,
  };
}

export async function resolveReservationTable(
  restaurantId: string,
  reservation: Reservation,
  body: { tableId?: string; manualTable?: Record<string, unknown> }
): Promise<DiningTable | null> {
  if (body.manualTable?.number) {
    const { upsertManualTable } = await import("@/lib/table-meta");
    const targetBranch =
      reservation.branchId ||
      (body.manualTable.branchId as string) ||
      (
        await prisma.branch.findFirst({
          where: { restaurantId, isActive: true },
          select: { id: true },
        })
      )?.id;
    if (!targetBranch) return null;
    return upsertManualTable(restaurantId, targetBranch, body.manualTable as never);
  }
  if (body.tableId || reservation.tableId) {
    return prisma.diningTable.findFirst({
      where: {
        id: (body.tableId || reservation.tableId)!,
        branch: { restaurantId },
      },
    });
  }
  return null;
}

export async function markReservationArrived(
  reservationId: string,
  restaurantId: string,
  actualGuestCount?: number
) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findFirst({
      where: { id: reservationId, restaurantId },
    });
    if (!r) throw new Error("الحجز غير موجود");

    if (["ARRIVED", "CHECKED_IN", "SEATED", "CONVERTED"].includes(r.status)) {
      if (actualGuestCount != null && actualGuestCount >= 1) {
        return tx.reservation.update({
          where: { id: reservationId },
          data: { actualArrivedGuestCount: actualGuestCount } as Prisma.ReservationUpdateInput,
        });
      }
      return r;
    }

    const now = new Date();
    const effectiveCount =
      actualGuestCount != null && actualGuestCount >= 1 ? actualGuestCount : undefined;

    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: "ARRIVED",
        arrivedAt: r.arrivedAt ?? now,
        checkedInAt: r.checkedInAt ?? now,
        ...(effectiveCount != null ? { actualArrivedGuestCount: effectiveCount } : {}),
      } as Prisma.ReservationUpdateInput,
    });

    if (effectiveCount != null && r.currentVisitId) {
      await tx.customerVisit.update({
        where: { id: r.currentVisitId },
        data: { guestCount: effectiveCount },
      });
      if (r.activeSessionId) {
        await tx.tableSession.update({
          where: { id: r.activeSessionId },
          data: { guestCount: effectiveCount },
        });
      }
    }

    return updated;
  });
}

export async function assignReservationTable(
  reservationId: string,
  restaurantId: string,
  table: DiningTable,
  staff: StaffCtx,
  minimumSpendAmount?: number | null
) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findFirst({
      where: { id: reservationId, restaurantId },
    });
    if (!r) throw new Error("الحجز غير موجود");

    const now = new Date();
    const snap = tableSnapshot(table);
    const minSpend = effectiveMinimumSpend(
      minimumSpendAmount ?? (r.minimumSpendAmount != null ? Number(r.minimumSpendAmount) : null),
      table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
    );

    let status: ReservationStatus = r.status;
    if (["CONFIRMED", "APPROVED", "PENDING", "ARRIVED"].includes(r.status)) {
      status = "CHECKED_IN";
    }

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        ...snap,
        status,
        arrivedAt: r.arrivedAt ?? now,
        checkedInAt: now,
        assignedAt: now,
        assignedByUserId: staff.userId ?? null,
        minimumSpendAmount: minSpend,
      },
    });
  });
}

export async function seatReservationFromBooking(
  reservationId: string,
  restaurantId: string,
  table: DiningTable,
  staff: StaffCtx,
  req?: NextRequest,
  minimumSpendAmount?: number | null,
  actualGuestCount?: number
) {
  const r0 = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId },
    include: { tableSession: true },
  });
  if (!r0) throw new Error("الحجز غير موجود");

  if (r0.activeSessionId) {
    const existing = await prisma.tableSession.findUnique({ where: { id: r0.activeSessionId } });
    if (existing && isActiveSession(existing)) {
      const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
      return { reservation: reservation!, session: existing, visit: null, idempotent: true };
    }
  }

  if (r0.tableSession && isActiveSession(r0.tableSession)) {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    return { reservation: reservation!, session: r0.tableSession, visit: null, idempotent: true };
  }

  const profile = r0.customerProfileId
    ? { id: r0.customerProfileId }
    : await upsertCustomerProfile(restaurantId, r0.customerName, r0.customerPhone);

  const result = await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findFirst({ where: { id: reservationId, restaurantId } });
    if (!r) throw new Error("الحجز غير موجود");

    const activeOnTable = await tx.tableSession.findFirst({
      where: {
        tableId: table.id,
        endedAt: null,
        status: { not: "COMPLETED" },
        NOT: { reservationId: r.id },
      },
    });
    if (activeOnTable) throw new Error("الطاولة مشغولة بجلسة نشطة");

    const now = new Date();
    const snap = tableSnapshot(table);
    const minSpend = effectiveMinimumSpend(
      minimumSpendAmount ?? (r.minimumSpendAmount != null ? Number(r.minimumSpendAmount) : null),
      table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
    );
    const displayNum = snap.tableNumberSnapshot || String(table.number);
    const effectiveGuestCount =
      actualGuestCount != null && actualGuestCount >= 1
        ? actualGuestCount
        : (r as Reservation & { actualArrivedGuestCount?: number | null }).actualArrivedGuestCount != null &&
            (r as Reservation & { actualArrivedGuestCount?: number | null }).actualArrivedGuestCount! >= 1
          ? (r as Reservation & { actualArrivedGuestCount?: number | null }).actualArrivedGuestCount!
          : r.guestCount;

    const visit = await tx.customerVisit.create({
      data: {
        restaurantId,
        customerProfileId: profile.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        guestCount: effectiveGuestCount,
        notes: r.notes,
        tableNumber: table.number,
        tableDisplayNumber: displayNum,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableZone: table.floorZone,
        minimumSpendAmount: minSpend,
        tableId: table.id,
        branchId: table.branchId,
        source: "reservation",
        arrivalTime: r.arrivedAt ?? now,
        enteredAt: now,
        seatedAt: now,
        assignedByUserId: staff.userId ?? null,
        visitStatus: "SEATED",
      },
    });

    const tableSession = await tx.tableSession.create({
      data: {
        restaurantId,
        branchId: table.branchId,
        tableId: table.id,
        tableNumber: table.number,
        tableDisplayNumber: displayNum,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableZone: table.floorZone,
        tableCapacity: table.capacity,
        customerVisitId: visit.id,
        reservationId: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        guestCount: effectiveGuestCount,
        minimumSpendAmount: minSpend,
        status: "SEATED",
        notes: r.notes,
      },
    });

    const updatedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        ...snap,
        status: "SEATED",
        arrivedAt: r.arrivedAt ?? now,
        checkedInAt: r.checkedInAt ?? now,
        seatedAt: now,
        assignedAt: r.assignedAt ?? now,
        assignedByUserId: staff.userId ?? r.assignedByUserId,
        currentVisitId: visit.id,
        activeSessionId: tableSession.id,
        minimumSpendAmount: minSpend,
      },
    });

    return { reservation: updatedReservation, session: tableSession, visit, idempotent: false };
  });

  if (!result.idempotent && req) {
    const meta = requestMeta(req);
    await onCustomerRegistered({
      visitId: result.visit.id,
      restaurantId,
      branchId: table.branchId,
      tableId: table.id,
      tableDisplayNumber:
        result.reservation.tableNumberSnapshot ||
        displayTableNumber(table.displayNumber || table.label || table.number),
      customerProfileId: result.visit.customerProfileId!,
      sessionStatus: "SEATED",
      staff: { userId: staff.userId, name: staff.userName },
      audit: meta,
    });
  }

  try {
    await syncTableOperationalStatus(table.id);
  } catch {
    /* optional */
  }

  return result;
}

export async function confirmArrivalWithTable(
  reservationId: string,
  restaurantId: string,
  table: DiningTable,
  staff: StaffCtx,
  opts?: {
    startSession?: boolean;
    minimumSpendAmount?: number | null;
    actualGuestCount?: number;
    req?: NextRequest;
  }
) {
  await markReservationArrived(
    reservationId,
    restaurantId,
    opts?.actualGuestCount
  );
  await assignReservationTable(
    reservationId,
    restaurantId,
    table,
    staff,
    opts?.minimumSpendAmount
  );

  if (opts?.startSession) {
    return seatReservationFromBooking(
      reservationId,
      restaurantId,
      table,
      staff,
      opts.req,
      opts?.minimumSpendAmount,
      opts?.actualGuestCount
    );
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  return { reservation: reservation!, session: null, visit: null, idempotent: false };
}

export function serializeCheckinResponse(
  reservation: Parameters<typeof serializeReservation>[0],
  session?: Parameters<typeof serializeTableSession>[0] | null,
  presentGuests?: unknown
) {
  return {
    reservation: serializeReservation(reservation),
    session: session ? serializeTableSession(session) : null,
    presentGuests: presentGuests ?? undefined,
  };
}
