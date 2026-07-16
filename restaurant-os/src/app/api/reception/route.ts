import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  getActiveSessionForTable,
  getTableBill,
  serializeTableSession,
  syncTableOperationalStatus,
  upsertCustomerProfile,
} from "@/lib/reception";
import {
  effectiveMinimumSpend,
  serializeTableMeta,
  sortTableCards,
  upsertManualTable,
  type TableSortKey,
} from "@/lib/table-meta";
import { menuUrlForTable } from "@/lib/table-code";
import { requestMeta } from "@/lib/request-meta";
import { onCustomerRegistered } from "@/lib/visit-tracking";
import { fetchPresentGuests } from "@/lib/present-guests";
import type { TableSessionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const branchId = req.nextUrl.searchParams.get("branchId");
  const sortBy = (req.nextUrl.searchParams.get("sortBy") || "sortOrder") as TableSortKey;

  const [tables, activeSessions, restaurant] = await Promise.all([
    prisma.diningTable.findMany({
      where: {
        branch: { restaurantId: restaurantId! },
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      include: { branch: { select: { id: true, name: true, nameAr: true } } },
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
    }),
    prisma.tableSession.findMany({
      where: {
        restaurantId: restaurantId!,
        endedAt: null,
        status: { not: "COMPLETED" },
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId! },
      select: { slug: true, name: true, nameAr: true },
    }),
  ]);

  const sessionByTable = new Map(activeSessions.map((s) => [s.tableId, s]));

  let cards = await Promise.all(
    tables.map(async (table) => {
      const sess = sessionByTable.get(table.id);
      let sessionData = null;
      if (sess) {
        const bill = await getTableBill(table.id, sess.startedAt);
        sessionData = serializeTableSession({
          ...sess,
          currentBill: bill.currentBill,
          ordersCount: bill.orderCount,
        });
      }

      const meta = serializeTableMeta(table);
      return {
        table: {
          ...meta,
          branchId: table.branchId,
          branchName: table.branch.nameAr || table.branch.name,
          tableCode: table.tableCode,
          menuUrl: menuUrlForTable(table.id, restaurant?.slug, table.tableCode),
        },
        session: sessionData,
        status: sess?.status ?? "AVAILABLE",
      };
    })
  );

  cards = sortTableCards(cards, sortBy);

  const presentGuests = await fetchPresentGuests(restaurantId!, branchId);

  return NextResponse.json({
    cards,
    presentGuests,
    branches: await prisma.branch.findMany({
      where: { restaurantId: restaurantId!, isActive: true },
      select: { id: true, name: true, nameAr: true },
    }),
  });
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
    guestCount = 1,
    tableId,
    manualTable,
    branchId,
    notes,
    minimumSpendAmount,
    status = "SEATED",
    marketingConsent = false,
  } = body;

  if (!customerName?.trim()) {
    return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
  }

  let table;
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
    table = await upsertManualTable(restaurantId!, targetBranch, manualTable);
  } else if (tableId) {
    table = await prisma.diningTable.findFirst({
      where: { id: tableId, branch: { restaurantId: restaurantId! }, isActive: true },
    });
  }

  if (!table) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  const existing = await getActiveSessionForTable(table.id);
  if (existing) {
    return NextResponse.json(
      { error: "الطاولة مشغولة بجلسة نشطة", sessionId: existing.id },
      { status: 409 }
    );
  }

  const minSpend = effectiveMinimumSpend(
    minimumSpendAmount != null && minimumSpendAmount !== ""
      ? parseFloat(String(minimumSpendAmount))
      : null,
    table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
  );

  const profile = await upsertCustomerProfile(
    restaurantId!,
    customerName.trim(),
    customerPhone?.trim() || null,
    Boolean(marketingConsent)
  );

  const now = new Date();
  const displayNum = manualTable?.number
    ? String(manualTable.number).trim()
    : String(table.number);
  const sessionStatus = status as TableSessionStatus;

  const visit = await prisma.customerVisit.create({
    data: {
      restaurantId: restaurantId!,
      customerProfileId: profile.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || null,
      guestCount: parseInt(String(guestCount)) || 1,
      notes: notes?.trim() || null,
      tableNumber: table.number,
      tableDisplayNumber: displayNum,
      tableLabel: table.label,
      tableIcon: table.tableIcon,
      tableZone: table.floorZone,
      minimumSpendAmount: minSpend,
      tableId: table.id,
      branchId: table.branchId,
      source: "reception",
      arrivalTime: now,
      visitStatus: sessionStatus === "WAITING" ? "WAITING" : "SEATED",
    },
  });

  const meta = requestMeta(req);
  await onCustomerRegistered({
    visitId: visit.id,
    restaurantId: restaurantId!,
    branchId: table.branchId,
    tableId: table.id,
    tableDisplayNumber: displayNum,
    customerProfileId: profile.id,
    sessionStatus,
    staff: { userId: session?.user?.id, name: session?.user?.name },
    audit: meta,
  });

  const tableSession = await prisma.tableSession.create({
    data: {
      restaurantId: restaurantId!,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      tableDisplayNumber: manualTable?.number
        ? String(manualTable.number).trim()
        : String(table.number),
      tableLabel: table.label,
      tableIcon: table.tableIcon,
      tableZone: table.floorZone,
      tableCapacity: table.capacity,
      customerVisitId: visit.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || null,
      guestCount: parseInt(String(guestCount)) || 1,
      minimumSpendAmount: minSpend,
      status: status as TableSessionStatus,
      notes: notes?.trim() || null,
    },
  });

  try {
    await syncTableOperationalStatus(table.id);
  } catch {
    /* optional */
  }

  const bill = await getTableBill(table.id, tableSession.startedAt);
  return NextResponse.json(
    serializeTableSession({ ...tableSession, currentBill: bill.currentBill, ordersCount: bill.orderCount }),
    { status: 201 }
  );
}
