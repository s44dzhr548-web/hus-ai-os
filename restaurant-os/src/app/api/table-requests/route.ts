import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TableRequestType } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_TYPES: TableRequestType[] = [
  "CALL_WAITER",
  "REQUEST_BILL",
  "CLEAN_TABLE",
  "HELP",
];

export async function GET(req: NextRequest) {
  const { requireRestaurant } = await import("@/lib/api-auth");
  const { restaurantId, error } = await requireRestaurant(
    req.nextUrl.searchParams.get("restaurantId")
  );
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status");

  const requests = await prisma.tableRequest.findMany({
    where: {
      restaurantId: restaurantId!,
      ...(status ? { status: status as "NEW" | "SEEN" | "DONE" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tableId, type, notes } = body;

  if (!tableId || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    include: { branch: { select: { restaurantId: true, id: true } } },
  });

  if (!table || !table.isActive) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  const request = await prisma.tableRequest.create({
    data: {
      restaurantId: table.branch.restaurantId,
      branchId: table.branch.id,
      tableId: table.id,
      type,
      notes,
    },
  });

  return NextResponse.json(request, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { requireRestaurant } = await import("@/lib/api-auth");
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: "المعرف والحالة مطلوبان" }, { status: 400 });
  }

  const existing = await prisma.tableRequest.findFirst({
    where: { id, restaurantId: restaurantId! },
  });
  if (!existing) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const updated = await prisma.tableRequest.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
