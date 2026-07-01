import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant, requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const menuItemId = req.nextUrl.searchParams.get("menuItemId");

  const groups = await prisma.menuItemOptionGroup.findMany({
    where: {
      restaurantId: restaurantId!,
      ...(menuItemId ? { menuItemId } : {}),
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const { session, restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();

  if (body.group) {
    const { menuItemId, name, nameAr, nameEn, type, isRequired, minSelect, maxSelect, options } =
      body.group;

    const group = await prisma.menuItemOptionGroup.create({
      data: {
        restaurantId: restaurantId!,
        menuItemId: menuItemId || null,
        name,
        nameAr,
        nameEn,
        type: type || "OPTIONAL",
        isRequired: Boolean(isRequired),
        minSelect: minSelect ?? 0,
        maxSelect: maxSelect ?? 1,
        options: options?.length
          ? {
              create: options.map(
                (
                  o: { name: string; nameAr?: string; nameEn?: string; price?: number },
                  i: number
                ) => ({
                  name: o.name,
                  nameAr: o.nameAr,
                  nameEn: o.nameEn,
                  price: o.price ?? 0,
                  sortOrder: i,
                })
              ),
            }
          : undefined,
      },
      include: { options: true },
    });

    await logAudit({
      restaurantId: restaurantId!,
      userId: session!.user.id,
      action: "CREATE_OPTION_GROUP",
      entity: "MenuItemOptionGroup",
      entityId: group.id,
    });

    return NextResponse.json(group, { status: 201 });
  }

  return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();
  const { id, options, ...data } = body;

  const existing = await prisma.menuItemOptionGroup.findFirst({
    where: { id, restaurantId: restaurantId! },
  });
  if (!existing) {
    return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });
  }

  const group = await prisma.menuItemOptionGroup.update({
    where: { id },
    data: {
      name: data.name,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      type: data.type,
      isRequired: data.isRequired,
      minSelect: data.minSelect,
      maxSelect: data.maxSelect,
      sortOrder: data.sortOrder,
    },
  });

  if (options?.length) {
    await prisma.menuItemOption.deleteMany({ where: { groupId: id } });
    await prisma.menuItemOption.createMany({
      data: options.map(
        (
          o: { name: string; nameAr?: string; nameEn?: string; price?: number; isDefault?: boolean },
          i: number
        ) => ({
          groupId: id,
          name: o.name,
          nameAr: o.nameAr,
          nameEn: o.nameEn,
          price: o.price ?? 0,
          isDefault: Boolean(o.isDefault),
          sortOrder: i,
        })
      ),
    });
  }

  const updated = await prisma.menuItemOptionGroup.findUnique({
    where: { id },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 });
  }

  const existing = await prisma.menuItemOptionGroup.findFirst({
    where: { id, restaurantId: restaurantId! },
  });
  if (!existing) {
    return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });
  }

  await prisma.menuItemOptionGroup.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
