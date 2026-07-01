import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { checkLimitAllowed } from "@/lib/permissions-engine";
import { tableCodeFor, menuUrlForTable } from "@/lib/table-code";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const branchId = req.nextUrl.searchParams.get("branchId");

  const tables = await prisma.diningTable.findMany({
    where: {
      branch: { restaurantId: restaurantId! },
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: { select: { name: true, nameAr: true } },
      _count: { select: { orders: true } },
    },
    orderBy: [{ branchId: "asc" }, { number: "asc" }],
  });

  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const body = await req.json();

  if (body.bulk) {
    const { branchId, count, startNumber = 1 } = body;
    const qty = parseInt(count);

    if (!branchId || !qty || qty < 1) {
      return NextResponse.json({ error: "الفرع وعدد الطاولات مطلوبان" }, { status: 400 });
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, restaurantId: restaurantId! },
    });
    if (!branch) {
      return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });
    }

    const limit = await checkLimitAllowed(restaurantId!, "tables", qty);
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.message, upgrade: true }, { status: 403 });
    }

    const lastTable = await prisma.diningTable.findFirst({
      where: { branchId },
      orderBy: { number: "desc" },
    });
    let nextNum = lastTable ? lastTable.number + 1 : parseInt(String(startNumber));

    const created = [];
    const slug =
      (
        await prisma.restaurant.findFirst({
          where: { id: restaurantId! },
          select: { slug: true },
        })
      )?.slug ?? "table";

    for (let i = 0; i < qty; i++) {
      const num = nextNum + i;
      const code = tableCodeFor(slug, num);
      const table = await prisma.diningTable.create({
        data: {
          branchId,
          number: num,
          label: `طاولة ${num}`,
          capacity: 4,
          tableCode: code,
        },
      });
      const updated = await prisma.diningTable.update({
        where: { id: table.id },
        data: { qrCode: menuUrlForTable(table.id, slug, code) },
      });
      created.push(updated);
    }

    return NextResponse.json({ created, count: created.length }, { status: 201 });
  }

  const { branchId, number, label, capacity } = body;

  if (!branchId || !number) {
    return NextResponse.json({ error: "الفرع ورقم الطاولة مطلوبان" }, { status: 400 });
  }

  const limit = await checkLimitAllowed(restaurantId!, "tables");
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message, upgrade: true }, { status: 403 });
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId: restaurantId! },
    include: { restaurant: { select: { slug: true } } },
  });
  if (!branch) {
    return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });
  }

  const num = parseInt(number);
  const code = tableCodeFor(branch.restaurant.slug, num);
  const table = await prisma.diningTable.create({
    data: {
      branchId,
      number: num,
      label: label || `طاولة ${number}`,
      capacity: capacity ? parseInt(capacity) : 4,
      tableCode: code,
    },
  });

  const updated = await prisma.diningTable.update({
    where: { id: table.id },
    data: { qrCode: menuUrlForTable(table.id, branch.restaurant.slug, code) },
  });

  return NextResponse.json(updated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const body = await req.json();
  const { id, ...data } = body;

  const existing = await prisma.diningTable.findFirst({
    where: { id, branch: { restaurantId: restaurantId! } },
  });
  if (!existing) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  const table = await prisma.diningTable.update({
    where: { id },
    data: {
      number: data.number ? parseInt(data.number) : undefined,
      label: data.label,
      capacity: data.capacity ? parseInt(data.capacity) : undefined,
      isActive: data.isActive,
    },
  });

  return NextResponse.json(table);
}

export async function DELETE(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
  }

  const existing = await prisma.diningTable.findFirst({
    where: { id, branch: { restaurantId: restaurantId! } },
  });
  if (!existing) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  await prisma.diningTable.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
