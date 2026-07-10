import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  getCustomerHistory,
  estimateWaitMinutes,
  createReceptionNotification,
  syncTableOperationalStatus,
  upsertCustomerProfile,
  recordCustomerVisitStats,
  serializeTableSession,
} from "@/lib/reception";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;
  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const branchId = req.nextUrl.searchParams.get("branchId");
  const entries = await prisma.waitingListEntry.findMany({
    where: {
      restaurantId: restaurantId!,
      status: { in: ["WAITING", "NOTIFIED"] },
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;
  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const body = await req.json();
  const {
    customerName,
    customerPhone,
    guestCount = 2,
    gender,
    occasion,
    notes,
    branchId,
  } = body;

  if (!customerName?.trim()) {
    return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
  }

  const profile = await upsertCustomerProfile(
    restaurantId!,
    customerName.trim(),
    customerPhone?.trim() || null
  );

  const waitMinutes = await estimateWaitMinutes(restaurantId!, branchId);

  const entry = await prisma.waitingListEntry.create({
    data: {
      restaurantId: restaurantId!,
      branchId: branchId || null,
      customerProfileId: profile.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || null,
      guestCount: parseInt(String(guestCount)) || 2,
      gender: gender || null,
      occasion: occasion || null,
      notes: notes?.trim() || null,
      estimatedWaitMinutes: waitMinutes,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;
  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const body = await req.json();
  const { id, action, tableId } = body;

  const entry = await prisma.waitingListEntry.findFirst({
    where: { id, restaurantId: restaurantId! },
  });
  if (!entry) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  if (action === "notify") {
    const updated = await prisma.waitingListEntry.update({
      where: { id },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });
    await createReceptionNotification(
      restaurantId!,
      "waiting_notify",
      "إشعار قائمة الانتظار",
      `تم إشعار ${entry.customerName} — الطاولة جاهزة`,
      "waiting_list",
      id
    );
    return NextResponse.json(updated);
  }

  if (action === "seat" && tableId) {
    const table = await prisma.diningTable.findFirst({
      where: { id: tableId, branch: { restaurantId: restaurantId! } },
    });
    if (!table) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
    }

    const visit = await prisma.customerVisit.create({
      data: {
        restaurantId: restaurantId!,
        customerProfileId: entry.customerProfileId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        guestCount: entry.guestCount,
        gender: entry.gender,
        occasion: entry.occasion,
        notes: entry.notes,
      },
    });

    if (entry.customerProfileId) await recordCustomerVisitStats(entry.customerProfileId);

    const tableSession = await prisma.tableSession.create({
      data: {
        restaurantId: restaurantId!,
        branchId: table.branchId,
        tableId: table.id,
        tableNumber: table.number,
        customerVisitId: visit.id,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        guestCount: entry.guestCount,
        gender: entry.gender,
        occasion: entry.occasion,
        staffMemberName: session!.user.name || null,
        status: "SEATED",
        notes: entry.notes,
      },
    });

    await syncTableOperationalStatus(table.id);

    const updated = await prisma.waitingListEntry.update({
      where: { id },
      data: { status: "SEATED", seatedAt: new Date(), tableSessionId: tableSession.id },
    });

    return NextResponse.json({
      entry: updated,
      session: serializeTableSession(tableSession),
    });
  }

  if (action === "cancel") {
    const updated = await prisma.waitingListEntry.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
