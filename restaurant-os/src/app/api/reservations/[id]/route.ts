import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  logReservationAudit,
  recordReservationStatusChange,
  transitionReservationStatus,
} from "@/lib/reservation-audit";
import { serializeRegisterRow } from "@/lib/reservation-register";
import { REGISTER_STATUS_LABELS } from "@/lib/reservation-labels";
import { formatRiyadhDateTime } from "@/lib/timezone";
import { checkReservationConflict, effectiveMinimumSpend } from "@/lib/table-meta";
import {
  resolveReservationTable,
  markReservationArrived,
  assignReservationTable,
  seatReservationFromBooking,
  confirmArrivalWithTable,
  serializeCheckinResponse,
} from "@/lib/reservation-checkin";
import { fetchPresentGuests } from "@/lib/present-guests";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const r = await prisma.reservation.findFirst({
    where: { id, restaurantId: restaurantId! },
    include: {
      branch: { select: { id: true, name: true, nameAr: true } },
      table: { select: { id: true, number: true, label: true, displayNumber: true } },
      tableSession: true,
      customerProfile: {
        select: {
          id: true,
          visitCount: true,
          totalSpending: true,
          lastVisitAt: true,
        },
      },
      statusHistory: { orderBy: { changedAt: "asc" } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!r) {
    return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
  }

  const userIds = [
    r.createdByUserId,
    r.updatedByUserId,
    r.assignedByUserId,
    r.confirmedByUserId,
    r.completedByUserId,
    ...r.statusHistory.map((h) => h.changedByUserId),
  ].filter(Boolean) as string[];

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const staffNames = new Map(users.map((u) => [u.id, u.name]));

  const timeline = [
    { key: "created", label: "تم الإنشاء", at: r.createdAt, by: r.createdByUserId },
    { key: "confirmed", label: "تم التأكيد", at: r.confirmedAt, by: r.confirmedByUserId },
    { key: "arrived", label: "وصل العميل", at: r.arrivedAt, by: null },
    { key: "assigned", label: "تعيين الطاولة", at: r.assignedAt, by: r.assignedByUserId },
    { key: "seated", label: "على الطاولة", at: r.seatedAt, by: null },
    { key: "ended", label: "انتهت الجلسة", at: r.sessionEndedAt ?? r.completedAt, by: r.completedByUserId },
  ]
    .filter((t) => t.at)
    .map((t) => ({
      ...t,
      at: t.at!.toISOString(),
      atDisplay: formatRiyadhDateTime(t.at),
      byName: t.by ? staffNames.get(t.by) ?? null : null,
    }));

  return NextResponse.json({
    reservation: serializeRegisterRow(r, staffNames),
    customer: r.customerProfile,
    timeline,
    statusHistory: r.statusHistory.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      previousLabel: h.previousStatus ? REGISTER_STATUS_LABELS[h.previousStatus] : null,
      newLabel: REGISTER_STATUS_LABELS[h.newStatus],
      changedAt: h.changedAt.toISOString(),
      changedAtDisplay: formatRiyadhDateTime(h.changedAt),
      changedByName: h.changedByUserId ? staffNames.get(h.changedByUserId) ?? null : null,
      note: h.note,
    })),
    auditLogs: r.auditLogs,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { restaurantId, session, error } = await requireRestaurantRole(RECEPTION_ROLES);
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
  const staff = {
    userId: session?.user?.id,
    userName: session?.user?.name ?? undefined,
  };

  async function withPresentGuests(
    reservation: NonNullable<Awaited<ReturnType<typeof prisma.reservation.findFirst>>>,
    session?: Parameters<typeof serializeCheckinResponse>[1]
  ) {
    if (!reservation) throw new Error("الحجز غير موجود");
    const presentGuests = await fetchPresentGuests(restaurantId!, reservation.branchId);
    return serializeCheckinResponse(reservation, session, presentGuests);
  }

  if (action === "approve" || action === "confirm") {
    const updated = await transitionReservationStatus(
      id,
      restaurantId!,
      "APPROVED",
      {
        confirmedAt: reservation.confirmedAt ?? now,
        confirmedByUserId: staff.userId ?? null,
      },
      staff,
      "RESERVATION_CONFIRMED"
    );
    return NextResponse.json(serializeRegisterRow(updated, new Map()));
  }

  if (action === "reject") {
    const updated = await transitionReservationStatus(
      id,
      restaurantId!,
      "REJECTED",
      { rejectedAt: now },
      staff,
      "RESERVATION_REJECTED"
    );
    return NextResponse.json(serializeRegisterRow(updated, new Map()));
  }

  if (action === "cancel") {
    const updated = await transitionReservationStatus(
      id,
      restaurantId!,
      "CANCELLED",
      { cancelledAt: now },
      staff,
      "RESERVATION_CANCELLED"
    );
    return NextResponse.json(serializeRegisterRow(updated, new Map()));
  }

  if (action === "no_show") {
    const updated = await transitionReservationStatus(
      id,
      restaurantId!,
      "NO_SHOW",
      { noShowAt: now },
      staff,
      "RESERVATION_NO_SHOW"
    );
    return NextResponse.json(serializeRegisterRow(updated, new Map()));
  }

  if (action === "edit" || action === "update") {
    const patch: Record<string, unknown> = { updatedByUserId: staff.userId ?? null };
    if (body.customerName) patch.customerName = String(body.customerName).trim();
    if (body.customerPhone) patch.customerPhone = String(body.customerPhone).trim();
    if (body.guestCount != null) patch.guestCount = parseInt(String(body.guestCount)) || 2;
    if (body.date) patch.date = new Date(body.date);
    if (body.time) patch.time = String(body.time);
    if (body.notes !== undefined) patch.notes = body.notes?.trim() || null;
    if (body.occasion !== undefined) patch.occasion = body.occasion?.trim() || null;
    const updated = await prisma.reservation.update({ where: { id }, data: patch as never });
    await logReservationAudit(restaurantId!, id, "RESERVATION_EDITED", staff, reservation, patch);
    return NextResponse.json(serializeRegisterRow(updated, new Map()));
  }

  if (action === "archive") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: { archivedAt: now, updatedByUserId: staff.userId ?? null },
    });
    await logReservationAudit(restaurantId!, id, "RESERVATION_ARCHIVED", staff);
    return NextResponse.json(serializeRegisterRow(updated, new Map()));
  }

  if (action === "assign_table") {
    try {
      const table = await resolveReservationTable(restaurantId!, reservation, body);
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
        body.minimumSpendAmount != null && body.minimumSpendAmount !== ""
          ? parseFloat(String(body.minimumSpendAmount))
          : reservation.minimumSpendAmount != null
            ? Number(reservation.minimumSpendAmount)
            : null,
        table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
      );

      let updated = reservation;
      if (!["ARRIVED", "CHECKED_IN", "SEATED", "CONVERTED"].includes(reservation.status)) {
        updated = await markReservationArrived(id, restaurantId!);
      }
      updated = await assignReservationTable(
        id,
        restaurantId!,
        table,
        staff,
        minSpend
      );

      return NextResponse.json(await withPresentGuests(updated));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل تعيين الطاولة" },
        { status: 400 }
      );
    }
  }

  if (action === "mark_arrived" || action === "customer_arrived") {
    try {
      const updated = await markReservationArrived(id, restaurantId!);
      return NextResponse.json(await withPresentGuests(updated));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل تسجيل الوصول" },
        { status: 400 }
      );
    }
  }

  if (action === "confirm_arrival" || action === "check_in") {
    try {
      const table = await resolveReservationTable(restaurantId!, reservation, body);
      if (!table) {
        return NextResponse.json({ error: "الطاولة مطلوبة لتأكيد الوصول" }, { status: 400 });
      }
      const result = await confirmArrivalWithTable(id, restaurantId!, table, staff, {
        startSession: Boolean(body.startSession),
        minimumSpendAmount:
          body.minimumSpendAmount != null && body.minimumSpendAmount !== ""
            ? parseFloat(String(body.minimumSpendAmount))
            : undefined,
        req,
      });
      return NextResponse.json(
        await withPresentGuests(result.reservation, result.session)
      );
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل تأكيد الوصول" },
        { status: 400 }
      );
    }
  }

  if (action === "convert" || action === "seat") {
    try {
      const table = await resolveReservationTable(restaurantId!, reservation, body);
      if (!table) {
        return NextResponse.json(
          { error: "يجب تعيين طاولة قبل التحويل" },
          { status: 400 }
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

      const result = await seatReservationFromBooking(
        id,
        restaurantId!,
        table,
        staff,
        req,
        minSpend
      );

      return NextResponse.json(
        await withPresentGuests(result.reservation, result.session)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل التحويل";
      const status = msg.includes("مشغولة") ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
