import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  getActiveSessionForTable,
  serializeTableSession,
  upsertCustomerProfile,
  serializeReservation,
} from "@/lib/reception";
import {
  checkReservationConflict,
  effectiveMinimumSpend,
  upsertManualTable,
} from "@/lib/table-meta";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const reservation = await prisma.reservation.findFirst({
    where: { id, restaurantId: restaurantId! },
  });

  if (!reservation) {
    return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action as string;
  const now = new Date();

  if (action === "approve" || action === "confirm") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    return NextResponse.json(serializeReservation(updated));
  }

  if (action === "reject") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "REJECTED", cancelledAt: now },
    });
    return NextResponse.json(serializeReservation(updated));
  }

  if (action === "cancel") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    return NextResponse.json(serializeReservation(updated));
  }

  if (action === "no_show") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "NO_SHOW", noShowAt: now },
    });
    return NextResponse.json(serializeReservation(updated));
  }

  if (action === "assign_table") {
    const { tableId, manualTable, minimumSpendAmount } = body;
    let table;
    if (manualTable?.number) {
      const targetBranch =
        reservation.branchId ||
        manualTable.branchId ||
        (
          await prisma.branch.findFirst({
            where: { restaurantId: restaurantId!, isActive: true },
            select: { id: true },
          })
        )?.id;
      if (!targetBranch) {
        return NextResponse.json({ error: "الفرع مطلوب للطاولة اليدوية" }, { status: 400 });
      }
      table = await upsertManualTable(restaurantId!, targetBranch, manualTable);
    } else if (tableId) {
      table = await prisma.diningTable.findFirst({
        where: { id: tableId, branch: { restaurantId: restaurantId! } },
      });
    }
    if (!table) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 400 });
    }
    if (table.capacity < reservation.guestCount) {
      return NextResponse.json(
        { error: `سعة الطاولة ${table.capacity} أقل من عدد الضيوف` },
        { status: 400 }
      );
    }
    const conflict = await checkReservationConflict(
      restaurantId!,
      table.id,
      reservation.date,
      id
    );
    if (conflict) {
      return NextResponse.json({ error: "الطاولة محجوزة في هذا التاريخ" }, { status: 409 });
    }
    const minSpend = effectiveMinimumSpend(
      minimumSpendAmount != null && minimumSpendAmount !== ""
        ? parseFloat(String(minimumSpendAmount))
        : reservation.minimumSpendAmount != null
          ? Number(reservation.minimumSpendAmount)
          : null,
      table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
    );
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        tableId: table.id,
        tableNumber: table.number,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableZone: table.floorZone,
        branchId: table.branchId,
        minimumSpendAmount: minSpend,
      },
    });
    return NextResponse.json(serializeReservation(updated));
  }

  if (action === "mark_arrived" || action === "customer_arrived") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "ARRIVED", arrivedAt: now },
    });
    return NextResponse.json(serializeReservation(updated));
  }

  if (action === "convert" || action === "seat") {
    let targetTableId = body.tableId || reservation.tableId;
    let table;

    if (body.manualTable?.number) {
      const targetBranch =
        reservation.branchId ||
        body.manualTable.branchId ||
        (
          await prisma.branch.findFirst({
            where: { restaurantId: restaurantId!, isActive: true },
            select: { id: true },
          })
        )?.id;
      if (!targetBranch) {
        return NextResponse.json({ error: "الفرع مطلوب للطاولة اليدوية" }, { status: 400 });
      }
      table = await upsertManualTable(restaurantId!, targetBranch, body.manualTable);
      targetTableId = table.id;
    } else if (targetTableId) {
      table = await prisma.diningTable.findFirst({
        where: { id: targetTableId, branch: { restaurantId: restaurantId! } },
      });
    }

    if (!table) {
      return NextResponse.json(
        { error: "يجب تعيين طاولة قبل التحويل" },
        { status: 400 }
      );
    }

    const existing = await getActiveSessionForTable(table.id);
    if (existing) {
      return NextResponse.json(
        { error: "الطاولة مشغولة بجلسة نشطة" },
        { status: 409 }
      );
    }

    const minSpend = effectiveMinimumSpend(
      body.minimumSpendAmount != null && body.minimumSpendAmount !== ""
        ? parseFloat(String(body.minimumSpendAmount))
        : reservation.minimumSpendAmount != null
          ? Number(reservation.minimumSpendAmount)
          : null,
      table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
    );

    const profile = reservation.customerProfileId
      ? { id: reservation.customerProfileId }
      : await upsertCustomerProfile(
          restaurantId!,
          reservation.customerName,
          reservation.customerPhone
        );

    const visit = await prisma.customerVisit.create({
      data: {
        restaurantId: restaurantId!,
        customerProfileId: profile.id,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        guestCount: reservation.guestCount,
        notes: reservation.notes,
        tableNumber: table.number,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableZone: table.floorZone,
        minimumSpendAmount: minSpend,
        arrivalTime: now,
        visitStatus: "ACTIVE",
      },
    });

    const tableSession = await prisma.tableSession.create({
      data: {
        restaurantId: restaurantId!,
        branchId: table.branchId,
        tableId: table.id,
        tableNumber: table.number,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableZone: table.floorZone,
        tableCapacity: table.capacity,
        customerVisitId: visit.id,
        reservationId: reservation.id,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        guestCount: reservation.guestCount,
        minimumSpendAmount: minSpend,
        status: "SEATED",
        notes: reservation.notes,
      },
    });

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CONVERTED",
        tableId: table.id,
        tableNumber: table.number,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableZone: table.floorZone,
        branchId: table.branchId,
        minimumSpendAmount: minSpend,
        arrivedAt: reservation.arrivedAt ?? now,
      },
    });

    return NextResponse.json({
      reservation: serializeReservation(updatedReservation),
      session: serializeTableSession(tableSession),
    });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
