import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant, requireRestaurantFromRequest, requireRestaurantRole } from "@/lib/api-auth";
import { assertLimit } from "@/lib/permissions-engine";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantFromRequest(req);
  if (error) return error;

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurantId!, parentId: null },
    include: {
      children: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { items: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();
  const { name, nameAr, nameEn, description, descriptionEn, sortOrder, parentId } = body;

  if (!name && !nameAr && !nameEn) {
    return NextResponse.json({ error: "اسم التصنيف مطلوب" }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.menuCategory.findFirst({
      where: { id: parentId, restaurantId: restaurantId! },
    });
    if (!parent) {
      return NextResponse.json({ error: "التصنيف الأب غير موجود" }, { status: 404 });
    }
  }

  const categoryLimit = await assertLimit(restaurantId!, "categories");
  if (categoryLimit) return categoryLimit;

  const maxOrder = await prisma.menuCategory.aggregate({
    where: { restaurantId: restaurantId!, parentId: parentId || null },
    _max: { sortOrder: true },
  });

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurantId!,
      parentId: parentId || null,
      name: name || nameAr || nameEn,
      nameAr,
      nameEn,
      description,
      descriptionEn,
      sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();
  const { id, ...raw } = body;

  const existing = await prisma.menuCategory.findFirst({
    where: { id, restaurantId: restaurantId! },
  });
  if (!existing) {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const stringFields = [
    "name",
    "nameAr",
    "nameEn",
    "description",
    "descriptionEn",
    "color",
    "icon",
    "imageUrl",
    "videoUrl",
    "previewUrl",
    "layout",
  ] as const;

  for (const key of stringFields) {
    if (raw[key] !== undefined) data[key] = raw[key];
  }

  if (raw.mediaType !== undefined) {
    data.mediaType = raw.mediaType === "VIDEO" ? "VIDEO" : "IMAGE";
  }

  if (raw.previewUrl !== undefined) {
    data.previewUrl = raw.previewUrl || null;
  }

  if (raw.isActive !== undefined) data.isActive = Boolean(raw.isActive);
  if (raw.sortOrder !== undefined) data.sortOrder = Number(raw.sortOrder);

  const category = await prisma.menuCategory.update({
    where: { id },
    data,
  });

  return NextResponse.json(category);
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();
  const { items } = body as {
    items: { id: string; sortOrder: number; parentId?: string | null }[];
  };

  if (!items?.length) {
    return NextResponse.json({ error: "لا توجد عناصر" }, { status: 400 });
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.menuCategory.updateMany({
        where: { id: item.id, restaurantId: restaurantId! },
        data: {
          sortOrder: item.sortOrder,
          ...(item.parentId !== undefined ? { parentId: item.parentId } : {}),
        },
      })
    )
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "معرف التصنيف مطلوب" }, { status: 400 });
  }

  await prisma.menuCategory.deleteMany({
    where: { id, restaurantId: restaurantId! },
  });

  return NextResponse.json({ deleted: true });
}
