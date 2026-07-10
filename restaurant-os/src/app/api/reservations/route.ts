import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import { upsertCustomerProfile, serializeReservation, suggestBestTable } from "@/lib/reception";
import {
  checkReservationConflict,
  effectiveMinimumSpend,
  upsertManualTable,
} from "@/lib/table-meta";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const status = req.nextUrl.searchParams.get("status");
  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");

  let statusFilter: unknown = undefined;
  if (status && status !== "all") {
    statusFilter =
      status === "CONFIRMED"
        ? { in: ["CONFIRMED", "APPROVED"] as const }
        : (status as never);
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId: restaurantId!,
      ...(statusFilter ? { status: statusFilter as never } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return NextResponse.json({
    reservations: reservations.map(serializeReservation),
  });
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
    date,
    time,
    occasion,
    notes,
    branchId,
    tableId,
    manualTable,
    autoAssign,
    preferredArea,
    minimumSpendAmount,
  } = body;

  if (!customerName?.trim() || !customerPhone?.trim() || !date || !time) {
    return NextResponse.json(
      { error: "الاسم والجوال والتاريخ والوقت مطلوبان" },
      { status: 400 }
    );
  }

  const guestNum = parseInt(String(guestCount)) || 2;
  let assignedTableId = tableId;
  let tableNumber: number | null = null;
  let tableLabel: string | null = null;
  let tableIcon: string | null = null;
  let tableZone: string | null = null;
  let assignedBranchId = branchId || null;
  let tableRecord;

  if (manualTable?.number) {
    const targetBranch =
      branchId ||
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
    tableRecord = await upsertManualTable(restaurantId!, targetBranch, manualTable);
    assignedTableId = tableRecord.id;
    tableNumber = tableRecord.number;
    tableLabel = tableRecord.label;
    tableIcon = tableRecord.tableIcon;
    tableZone = tableRecord.floorZone;
    assignedBranchId = tableRecord.branchId;
  } else if (autoAssign && !tableId) {
    const suggested = await suggestBestTable(
      restaurantId!,
      guestNum,
      branchId,
      preferredArea
    );
    if (suggested) {
      assignedTableId = suggested.id;
      tableNumber = suggested.number;
      tableLabel = suggested.label;
      tableIcon = suggested.tableIcon;
      tableZone = suggested.floorZone;
      assignedBranchId = suggested.branchId;
      tableRecord = suggested;
    }
  } else if (tableId) {
    tableRecord = await prisma.diningTable.findFirst({
      where: { id: tableId, branch: { restaurantId: restaurantId! } },
    });
    if (!tableRecord) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
    }
    if (tableRecord.capacity < guestNum) {
      return NextResponse.json(
        { error: `سعة الطاولة ${tableRecord.capacity} أقل من عدد الضيوف ${guestNum}` },
        { status: 400 }
      );
    }
    tableNumber = tableRecord.number;
    tableLabel = tableRecord.label;
    tableIcon = tableRecord.tableIcon;
    tableZone = tableRecord.floorZone;
    assignedBranchId = tableRecord.branchId;
  }

  if (assignedTableId) {
    const conflict = await checkReservationConflict(
      restaurantId!,
      assignedTableId,
      new Date(date)
    );
    if (conflict) {
      return NextResponse.json(
        { error: "الطاولة محجوزة في هذا التاريخ", conflictId: conflict.id },
        { status: 409 }
      );
    }
  }

  const minSpend = effectiveMinimumSpend(
    minimumSpendAmount != null && minimumSpendAmount !== ""
      ? parseFloat(String(minimumSpendAmount))
      : null,
    tableRecord?.minimumSpendAmount != null
      ? Number(tableRecord.minimumSpendAmount)
      : null
  );

  const profile = await upsertCustomerProfile(
    restaurantId!,
    customerName.trim(),
    customerPhone.trim()
  );

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurantId!,
      branchId: assignedBranchId,
      customerProfileId: profile.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      guestCount: guestNum,
      date: new Date(date),
      time: String(time),
      occasion: occasion?.trim() || null,
      notes: notes?.trim() || null,
      preferredArea: preferredArea?.trim() || tableZone || null,
      tableId: assignedTableId || null,
      tableNumber,
      tableLabel,
      tableIcon: tableIcon as never,
      tableZone,
      minimumSpendAmount: minSpend,
      status: "PENDING",
    },
  });

  return NextResponse.json(serializeReservation(reservation), { status: 201 });
}
