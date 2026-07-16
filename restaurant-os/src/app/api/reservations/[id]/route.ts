import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import { serializeReservation } from "@/lib/reception";
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
    reservation: Parameters<typeof serializeReservation>[0],
    session?: Parameters<typeof serializeCheckinResponse>[1]
  ) {
    const presentGuests = await fetchPresentGuests(restaurantId!, reservation.branchId);
    return serializeCheckinResponse(reservation, session, presentGuests);
  }

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
