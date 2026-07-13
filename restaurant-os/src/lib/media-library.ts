import prisma from "@/lib/prisma";

export type MediaKind = "image" | "video";

export type MediaUsageType =
  | "hero_video"
  | "hero_image"
  | "logo"
  | "cover"
  | "category_image"
  | "category_video"
  | "menu_item_image"
  | "menu_item_video"
  | "menu_item_gallery";

export interface MediaUsage {
  type: MediaUsageType;
  labelAr: string;
  labelEn: string;
  entityId?: string;
  entityName?: string;
}

export interface MediaLibraryItem {
  url: string;
  kind: MediaKind;
  usages: MediaUsage[];
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;

export function detectMediaKind(url: string): MediaKind {
  return VIDEO_EXT.test(url) ? "video" : "image";
}

function pushUsage(
  map: Map<string, MediaLibraryItem>,
  url: string | null | undefined,
  usage: MediaUsage
) {
  if (!url?.trim()) return;
  const normalized = url.trim();
  const existing = map.get(normalized);
  if (existing) {
    existing.usages.push(usage);
    return;
  }
  map.set(normalized, {
    url: normalized,
    kind: detectMediaKind(normalized),
    usages: [usage],
  });
}

function parseGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

export async function buildMediaLibrary(restaurantId: string): Promise<MediaLibraryItem[]> {
  const [restaurant, categories, items] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        logoUrl: true,
        coverUrl: true,
        heroVideoUrl: true,
        heroImageUrl: true,
      },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        imageUrl: true,
        videoUrl: true,
        previewUrl: true,
      },
    }),
    prisma.menuItem.findMany({
      where: { category: { restaurantId } },
      select: {
        id: true,
        name: true,
        nameAr: true,
        imageUrl: true,
        videoUrl: true,
        previewUrl: true,
        galleryUrls: true,
        category: { select: { name: true, nameAr: true } },
      },
    }),
  ]);

  const map = new Map<string, MediaLibraryItem>();

  if (restaurant) {
    pushUsage(map, restaurant.heroVideoUrl, {
      type: "hero_video",
      labelAr: "فيديو الهيرو — الصفحة الرئيسية",
      labelEn: "Landing hero video",
    });
    pushUsage(map, restaurant.heroImageUrl, {
      type: "hero_image",
      labelAr: "صورة بديلة للهيرو",
      labelEn: "Hero fallback image",
    });
    pushUsage(map, restaurant.logoUrl, {
      type: "logo",
      labelAr: "شعار المطعم",
      labelEn: "Restaurant logo",
    });
    pushUsage(map, restaurant.coverUrl, {
      type: "cover",
      labelAr: "غلاف المطعم",
      labelEn: "Restaurant cover",
    });
  }

  for (const cat of categories) {
    const label = cat.nameAr || cat.name;
    pushUsage(map, cat.imageUrl, {
      type: "category_image",
      labelAr: `صورة قسم: ${label}`,
      labelEn: `Category image: ${label}`,
      entityId: cat.id,
      entityName: label,
    });
    pushUsage(map, cat.videoUrl, {
      type: "category_video",
      labelAr: `فيديو قسم: ${label}`,
      labelEn: `Category video: ${label}`,
      entityId: cat.id,
      entityName: label,
    });
    if (cat.previewUrl && cat.previewUrl !== cat.imageUrl && cat.previewUrl !== cat.videoUrl) {
      pushUsage(map, cat.previewUrl, {
        type: "category_image",
        labelAr: `معاينة قسم: ${label}`,
        labelEn: `Category preview: ${label}`,
        entityId: cat.id,
        entityName: label,
      });
    }
  }

  for (const item of items) {
    const label = item.nameAr || item.name;
    const catLabel = item.category.nameAr || item.category.name;
    pushUsage(map, item.imageUrl, {
      type: "menu_item_image",
      labelAr: `صورة صنف: ${label}`,
      labelEn: `Menu item image: ${label}`,
      entityId: item.id,
      entityName: `${label} (${catLabel})`,
    });
    pushUsage(map, item.videoUrl, {
      type: "menu_item_video",
      labelAr: `فيديو صنف: ${label}`,
      labelEn: `Menu item video: ${label}`,
      entityId: item.id,
      entityName: `${label} (${catLabel})`,
    });
    for (const galleryUrl of parseGalleryUrls(item.galleryUrls)) {
      pushUsage(map, galleryUrl, {
        type: "menu_item_gallery",
        labelAr: `معرض صنف: ${label}`,
        labelEn: `Item gallery: ${label}`,
        entityId: item.id,
        entityName: `${label} (${catLabel})`,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "video" ? -1 : 1;
    return a.url.localeCompare(b.url);
  });
}

export type MediaAssignTarget =
  | { type: "hero_video" }
  | { type: "hero_image" }
  | { type: "logo" }
  | { type: "cover" }
  | { type: "menu_item_image"; itemId: string }
  | { type: "menu_item_video"; itemId: string }
  | { type: "menu_item_gallery"; itemId: string }
  | { type: "category_image"; categoryId: string }
  | { type: "category_video"; categoryId: string };

export async function assignMediaUrl(
  restaurantId: string,
  url: string,
  target: MediaAssignTarget
): Promise<{ field: string; entityId?: string }> {
  const mediaUrl = url.trim();
  if (!mediaUrl) throw new Error("رابط الوسائط مطلوب");

  switch (target.type) {
    case "hero_video":
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { heroVideoUrl: mediaUrl },
      });
      return { field: "heroVideoUrl" };
    case "hero_image":
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { heroImageUrl: mediaUrl },
      });
      return { field: "heroImageUrl" };
    case "logo":
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { logoUrl: mediaUrl },
      });
      return { field: "logoUrl" };
    case "cover":
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { coverUrl: mediaUrl },
      });
      return { field: "coverUrl" };
    case "menu_item_image": {
      const item = await prisma.menuItem.findFirst({
        where: { id: target.itemId, category: { restaurantId } },
      });
      if (!item) throw new Error("الصنف غير موجود");
      await prisma.menuItem.update({
        where: { id: target.itemId },
        data: {
          imageUrl: mediaUrl,
          previewUrl: mediaUrl,
          mediaType: "IMAGE",
        },
      });
      return { field: "imageUrl", entityId: target.itemId };
    }
    case "menu_item_video": {
      const item = await prisma.menuItem.findFirst({
        where: { id: target.itemId, category: { restaurantId } },
      });
      if (!item) throw new Error("الصنف غير موجود");
      await prisma.menuItem.update({
        where: { id: target.itemId },
        data: {
          videoUrl: mediaUrl,
          previewUrl: mediaUrl,
          mediaType: "VIDEO",
        },
      });
      return { field: "videoUrl", entityId: target.itemId };
    }
    case "menu_item_gallery": {
      const item = await prisma.menuItem.findFirst({
        where: { id: target.itemId, category: { restaurantId } },
      });
      if (!item) throw new Error("الصنف غير موجود");
      const current = parseGalleryUrls(item.galleryUrls);
      if (!current.includes(mediaUrl)) current.push(mediaUrl);
      await prisma.menuItem.update({
        where: { id: target.itemId },
        data: { galleryUrls: current },
      });
      return { field: "galleryUrls", entityId: target.itemId };
    }
    case "category_image": {
      const cat = await prisma.menuCategory.findFirst({
        where: { id: target.categoryId, restaurantId },
      });
      if (!cat) throw new Error("القسم غير موجود");
      await prisma.menuCategory.update({
        where: { id: target.categoryId },
        data: {
          imageUrl: mediaUrl,
          previewUrl: mediaUrl,
          mediaType: "IMAGE",
        },
      });
      return { field: "imageUrl", entityId: target.categoryId };
    }
    case "category_video": {
      const cat = await prisma.menuCategory.findFirst({
        where: { id: target.categoryId, restaurantId },
      });
      if (!cat) throw new Error("القسم غير موجود");
      await prisma.menuCategory.update({
        where: { id: target.categoryId },
        data: {
          videoUrl: mediaUrl,
          previewUrl: mediaUrl,
          mediaType: "VIDEO",
        },
      });
      return { field: "videoUrl", entityId: target.categoryId };
    }
    default:
      throw new Error("هدف غير مدعوم");
  }
}
