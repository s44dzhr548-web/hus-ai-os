import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant, requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature, checkLimitAllowed } from "@/lib/permissions-engine";

export const dynamic = "force-dynamic";

const ITEM_STRING_FIELDS = [
  "name",
  "nameAr",
  "nameEn",
  "description",
  "descriptionAr",
  "descriptionEn",
  "imageUrl",
  "videoUrl",
  "previewUrl",
] as const;

function buildItemData(raw: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  for (const key of ITEM_STRING_FIELDS) {
    if (raw[key] !== undefined) data[key] = raw[key] || null;
  }

  if (raw.mediaType !== undefined) {
    data.mediaType = raw.mediaType === "VIDEO" ? "VIDEO" : "IMAGE";
  }
  if (raw.price !== undefined) data.price = raw.price;
  if (raw.discountPrice !== undefined) data.discountPrice = raw.discountPrice || null;
  if (raw.galleryUrls !== undefined) data.galleryUrls = raw.galleryUrls || null;
  if (raw.calories !== undefined) {
    data.calories = raw.calories != null ? parseInt(String(raw.calories)) : null;
  }
  if (raw.prepTimeMinutes !== undefined) {
    data.prepTimeMinutes =
      raw.prepTimeMinutes != null ? parseInt(String(raw.prepTimeMinutes)) : null;
  }
  if (raw.isAvailable !== undefined) data.isAvailable = Boolean(raw.isAvailable);
  if (raw.isFeatured !== undefined) data.isFeatured = Boolean(raw.isFeatured);
  if (raw.sortOrder !== undefined) data.sortOrder = Number(raw.sortOrder);
  if (raw.categoryId !== undefined) data.categoryId = raw.categoryId;

  return data;
}

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const categoryId = req.nextUrl.searchParams.get("categoryId");

  const items = await prisma.menuItem.findMany({
    where: {
      category: { restaurantId: restaurantId! },
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: { select: { name: true, nameAr: true, nameEn: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();

  if (body.duplicateFrom) {
    const source = await prisma.menuItem.findFirst({
      where: { id: body.duplicateFrom, category: { restaurantId: restaurantId! } },
    });
    if (!source) {
      return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
    }

    const itemLimit = await checkLimitAllowed(restaurantId!, "items");
    if (!itemLimit.allowed) {
      return NextResponse.json({ error: itemLimit.message, upgrade: true }, { status: 403 });
    }

    const maxOrder = await prisma.menuItem.aggregate({
      where: { categoryId: source.categoryId },
      _max: { sortOrder: true },
    });

    const copy = await prisma.menuItem.create({
      data: {
        categoryId: source.categoryId,
        name: `${source.name} (نسخة)`,
        nameAr: source.nameAr ? `${source.nameAr} (نسخة)` : null,
        nameEn: source.nameEn ? `${source.nameEn} (copy)` : null,
        description: source.description,
        descriptionAr: source.descriptionAr,
        descriptionEn: source.descriptionEn,
        price: source.price,
        discountPrice: source.discountPrice,
        imageUrl: source.imageUrl,
        videoUrl: source.videoUrl,
        mediaType: source.mediaType,
        previewUrl: source.previewUrl,
        galleryUrls: source.galleryUrls ?? undefined,
        calories: source.calories,
        prepTimeMinutes: source.prepTimeMinutes,
        isAvailable: source.isAvailable,
        isFeatured: false,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(copy, { status: 201 });
  }

  const {
    categoryId,
    name,
    nameAr,
    nameEn,
    price,
    calories,
    descriptionAr,
    sortOrder,
    ...rest
  } = body;

  if (!categoryId || (!name && !nameAr && !nameEn) || price == null) {
    return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
  }

  if (calories == null || Number.isNaN(parseInt(String(calories), 10))) {
    return NextResponse.json({ error: "السعرات الحرارية مطلوبة" }, { status: 400 });
  }

  if (!descriptionAr && !rest.description) {
    return NextResponse.json({ error: "الوصف بالعربي مطلوب" }, { status: 400 });
  }

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId: restaurantId! },
  });
  if (!category) {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  }

  const itemLimit = await checkLimitAllowed(restaurantId!, "items");
  if (!itemLimit.allowed) {
    return NextResponse.json({ error: itemLimit.message, upgrade: true }, { status: 403 });
  }

  if (body.mediaType === "VIDEO" || body.videoUrl) {
    const videoCheck = await assertFeature(restaurantId!, "video");
    if (videoCheck) return videoCheck;
  }

  const maxOrder = await prisma.menuItem.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      categoryId,
      name: name || nameAr || nameEn,
      nameAr,
      nameEn,
      price,
      calories: parseInt(String(calories), 10),
      sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      ...buildItemData({ ...rest, descriptionAr, calories }),
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();
  const { id, ...raw } = body;

  const existing = await prisma.menuItem.findFirst({
    where: { id, category: { restaurantId: restaurantId! } },
  });
  if (!existing) {
    return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
  }

  if (
    (raw.mediaType === "VIDEO" || raw.videoUrl) &&
    (raw.mediaType === "VIDEO" || !existing.videoUrl)
  ) {
    const videoCheck = await assertFeature(restaurantId!, "video");
    if (videoCheck) return videoCheck;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: buildItemData(raw),
  });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (error) return error;

  const body = await req.json();
  const { items } = body as { items: { id: string; sortOrder: number }[] };

  if (!items?.length) {
    return NextResponse.json({ error: "لا توجد عناصر" }, { status: 400 });
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.menuItem.updateMany({
        where: { id: item.id, category: { restaurantId: restaurantId! } },
        data: { sortOrder: item.sortOrder },
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
    return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
  }

  await prisma.menuItem.deleteMany({
    where: { id, category: { restaurantId: restaurantId! } },
  });

  return NextResponse.json({ deleted: true });
}
