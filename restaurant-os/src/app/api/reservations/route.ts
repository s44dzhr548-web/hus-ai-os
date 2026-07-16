import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import { upsertCustomerProfile, suggestBestTable } from "@/lib/reception";
import {
  checkReservationConflict,
  effectiveMinimumSpend,
  upsertManualTable,
} from "@/lib/table-meta";
import {
  queryReservations,
  getReservationStats,
  nextReservationNumber,
  exportReservationsCsv,
  exportReservationsPrintHtml,
  buildReservationOrderBy,
  serializeRegisterRow,
} from "@/lib/reservation-register";
import {
  logReservationAudit,
  recordReservationStatusChange,
} from "@/lib/reservation-audit";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

function parseQuery(req: NextRequest, restaurantId: string) {
  const p = req.nextUrl.searchParams;
  return {
    restaurantId,
    mode: (p.get("mode") as "active" | "history" | "all") || "all",
    q: p.get("q") || undefined,
    status: p.get("status") || undefined,
    quick: p.get("quick") || undefined,
    branchId: p.get("branchId") || undefined,
    tableId: p.get("tableId") || undefined,
    source: p.get("source") || undefined,
    createdByUserId: p.get("createdByUserId") || undefined,
    guestCount: p.get("guestCount") ? parseInt(p.get("guestCount")!) : undefined,
    reservationDateFrom: p.get("reservationDateFrom") || undefined,
    reservationDateTo: p.get("reservationDateTo") || undefined,
    createdFrom: p.get("createdFrom") || undefined,
    createdTo: p.get("createdTo") || undefined,
    sortBy: p.get("sortBy") || undefined,
    sortDir: (p.get("sortDir") as "asc" | "desc") || "asc",
    page: p.get("page") ? parseInt(p.get("page")!) : 1,
    pageSize: p.get("pageSize") ? parseInt(p.get("pageSize")!) : 50,
  };
}

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  if (req.nextUrl.searchParams.get("export") === "csv") {
    const q = parseQuery(req, restaurantId!);
    q.pageSize = 5000;
    q.page = 1;
    const { reservations } = await queryReservations(q);
    const csv = exportReservationsCsv(reservations);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reservations-${Date.now()}.csv"`,
      },
    });
  }

  if (req.nextUrl.searchParams.get("export") === "pdf") {
    const q = parseQuery(req, restaurantId!);
    q.pageSize = 5000;
    q.page = 1;
    const { reservations } = await queryReservations(q);
    const html = exportReservationsPrintHtml(
      reservations,
      q.mode === "history" ? "السجل الكامل للحجوزات" : "سجل الحجوزات"
    );
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="reservations-${Date.now()}.html"`,
      },
    });
  }

  const q = parseQuery(req, restaurantId!);
  const [result, stats, branches] = await Promise.all([
    queryReservations(q),
    getReservationStats(restaurantId!, q.branchId),
    prisma.branch.findMany({
      where: { restaurantId: restaurantId!, isActive: true },
      select: { id: true, name: true, nameAr: true },
    }),
  ]);

  return NextResponse.json({ ...result, stats, branches });
}

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(RECEPTION_ROLES);
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
    source = "dashboard",
  } = body;

  if (!customerName?.trim() || !customerPhone?.trim() || !date || !time) {
    return NextResponse.json(
      { error: "الاسم والجوال والتاريخ والوقت مطلوبان" },
      { status: 400 }
    );
  }

  const staff = {
    userId: session?.user?.id,
    userName: session?.user?.name ?? undefined,
  };

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

  const reservationNumber = await nextReservationNumber(restaurantId!);

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurantId!,
      branchId: assignedBranchId,
      customerProfileId: profile.id,
      reservationNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      guestCount: guestNum,
      date: new Date(date),
      time: String(time),
      occasion: occasion?.trim() || null,
      notes: notes?.trim() || null,
      preferredArea: preferredArea?.trim() || tableZone || null,
      source: String(source),
      tableId: assignedTableId || null,
      tableNumber,
      tableLabel,
      tableIcon: tableIcon as never,
      tableZone,
      minimumSpendAmount: minSpend,
      status: "PENDING",
      createdByUserId: staff.userId ?? null,
      updatedByUserId: staff.userId ?? null,
    },
    include: {
      branch: { select: { id: true, name: true, nameAr: true } },
      table: { select: { id: true, number: true, label: true, displayNumber: true } },
      tableSession: { select: { id: true, endedAt: true, startedAt: true } },
    },
  });

  await recordReservationStatusChange(reservation.id, null, "PENDING", staff, "إنشاء الحجز");
  await logReservationAudit(
    restaurantId!,
    reservation.id,
    "RESERVATION_CREATED",
    staff,
    null,
    { reservationNumber, customerName: reservation.customerName }
  );

  const staffNames = new Map<string, string | null>();
  if (staff.userId) staffNames.set(staff.userId, staff.userName ?? null);

  return NextResponse.json(serializeRegisterRow(reservation, staffNames), { status: 201 });
}
