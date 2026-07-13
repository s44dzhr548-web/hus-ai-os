import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { buildMediaLibrary, assignMediaUrl, detectMediaKind } from "@/lib/media-library";
import { storageStatus } from "@/lib/storage";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MEDIA_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(MEDIA_ROLES);
  if (error) return error;

  const [items, categories, menuItems, restaurant] = await Promise.all([
    buildMediaLibrary(restaurantId!),
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurantId! },
      select: { id: true, name: true, nameAr: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { category: { restaurantId: restaurantId! } },
      select: {
        id: true,
        name: true,
        nameAr: true,
        category: { select: { name: true, nameAr: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: 200,
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId! },
      select: {
        heroVideoUrl: true,
        heroImageUrl: true,
        logoUrl: true,
        coverUrl: true,
        slug: true,
      },
    }),
  ]);

  return NextResponse.json({
    items,
    storage: storageStatus(),
    restaurant: restaurant
      ? {
          slug: restaurant.slug,
          heroVideoUrl: restaurant.heroVideoUrl,
          heroImageUrl: restaurant.heroImageUrl,
          logoUrl: restaurant.logoUrl,
          coverUrl: restaurant.coverUrl,
        }
      : null,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.nameAr || c.name,
    })),
    menuItems: menuItems.map((i) => ({
      id: i.id,
      name: i.nameAr || i.name,
      category: i.category.nameAr || i.category.name,
    })),
    counts: {
      total: items.length,
      images: items.filter((i) => i.kind === "image").length,
      videos: items.filter((i) => i.kind === "video").length,
    },
  });
}

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(MEDIA_ROLES);
  if (error) return error;

  const body = await req.json();
  const url = String(body.url || "").trim();
  const targetType = String(body.targetType || "");

  if (!url) {
    return NextResponse.json({ error: "رابط الوسائط مطلوب" }, { status: 400 });
  }

  if (detectMediaKind(url) === "video") {
    const videoCheck = await assertFeature(restaurantId!, "video");
    if (videoCheck) return videoCheck;
  }

  let target: Parameters<typeof assignMediaUrl>[2];

  switch (targetType) {
    case "hero_video":
      target = { type: "hero_video" };
      break;
    case "hero_image":
      target = { type: "hero_image" };
      break;
    case "logo":
      target = { type: "logo" };
      break;
    case "cover":
      target = { type: "cover" };
      break;
    case "menu_item_image":
      if (!body.itemId) {
        return NextResponse.json({ error: "معرف الصنف مطلوب" }, { status: 400 });
      }
      target = { type: "menu_item_image", itemId: String(body.itemId) };
      break;
    case "menu_item_video":
      if (!body.itemId) {
        return NextResponse.json({ error: "معرف الصنف مطلوب" }, { status: 400 });
      }
      target = { type: "menu_item_video", itemId: String(body.itemId) };
      break;
    case "menu_item_gallery":
      if (!body.itemId) {
        return NextResponse.json({ error: "معرف الصنف مطلوب" }, { status: 400 });
      }
      target = { type: "menu_item_gallery", itemId: String(body.itemId) };
      break;
    case "category_image":
      if (!body.categoryId) {
        return NextResponse.json({ error: "معرف القسم مطلوب" }, { status: 400 });
      }
      target = { type: "category_image", categoryId: String(body.categoryId) };
      break;
    case "category_video":
      if (!body.categoryId) {
        return NextResponse.json({ error: "معرف القسم مطلوب" }, { status: 400 });
      }
      target = { type: "category_video", categoryId: String(body.categoryId) };
      break;
    default:
      return NextResponse.json({ error: "نوع النشر غير مدعوم" }, { status: 400 });
  }

  try {
    const result = await assignMediaUrl(restaurantId!, url, target);
    await logAudit({
      restaurantId: restaurantId!,
      userId: session?.user?.id,
      action: "MEDIA_PUBLISH",
      entity: target.type,
      entityId: result.entityId,
      metadata: { url, field: result.field },
    });
    const items = await buildMediaLibrary(restaurantId!);
    return NextResponse.json({ success: true, published: result, items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل النشر" },
      { status: 400 }
    );
  }
}
