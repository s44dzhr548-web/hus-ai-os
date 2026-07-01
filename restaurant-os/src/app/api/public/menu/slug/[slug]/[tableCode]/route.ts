import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function mapItem(item: {
  id: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  description: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  price: unknown;
  discountPrice: unknown;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaType?: string | null;
  previewUrl?: string | null;
  isFeatured: boolean;
  isAvailable: boolean;
  calories: number | null;
  prepTimeMinutes: number | null;
  galleryUrls: unknown;
  optionGroups?: {
    id: string;
    name: string;
    nameAr: string | null;
    nameEn: string | null;
    type: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    options: {
      id: string;
      name: string;
      nameAr: string | null;
      nameEn: string | null;
      price: unknown;
      isDefault: boolean;
    }[];
  }[];
}) {
  const price = Number(item.price);
  const discountPrice =
    item.discountPrice != null ? Number(item.discountPrice) : null;
  const gallery = Array.isArray(item.galleryUrls)
    ? (item.galleryUrls as string[])
    : null;
  return {
    id: item.id,
    name: item.name,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    description: item.description,
    descriptionAr: item.descriptionAr,
    descriptionEn: item.descriptionEn,
    price,
    discountPrice,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    mediaType: item.mediaType,
    previewUrl: item.previewUrl,
    galleryUrls: gallery,
    isFeatured: item.isFeatured,
    isAvailable: item.isAvailable,
    calories: item.calories,
    prepTimeMinutes: item.prepTimeMinutes,
    optionGroups: item.optionGroups?.map((g) => ({
      id: g.id,
      name: g.name,
      nameAr: g.nameAr,
      nameEn: g.nameEn,
      type: g.type,
      isRequired: g.isRequired,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        nameAr: o.nameAr,
        nameEn: o.nameEn,
        price: Number(o.price),
        isDefault: o.isDefault,
      })),
    })),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; tableCode: string }> }
) {
  const { slug, tableCode } = await params;

  const table = await prisma.diningTable.findFirst({
    where: {
      tableCode,
      branch: { restaurant: { slug } },
    },
    include: {
      branch: {
        include: {
          restaurant: {
            include: {
              menuCategories: {
                where: { isActive: true, parentId: null },
                orderBy: { sortOrder: "asc" },
                include: {
                  children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                    include: {
                      items: {
                        orderBy: { sortOrder: "asc" },
                        include: {
                          optionGroups: {
                            include: {
                              options: { orderBy: { sortOrder: "asc" } },
                            },
                            orderBy: { sortOrder: "asc" },
                          },
                        },
                      },
                    },
                  },
                  items: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      optionGroups: {
                        include: {
                          options: { orderBy: { sortOrder: "asc" } },
                        },
                        orderBy: { sortOrder: "asc" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!table || !table.isActive) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  const restaurant = table.branch.restaurant;
  const defaultCategoryColor = restaurant.categoryColor || "#047857";
  const allItems = restaurant.menuCategories.flatMap((c) => [
    ...c.items,
    ...c.children.flatMap((s) => s.items),
  ]);
  const suggested = [...allItems]
    .filter((i) => i.isAvailable)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 6)
    .map(mapItem);

  return NextResponse.json({
    table: {
      id: table.id,
      number: table.number,
      label: table.label,
      tableCode: table.tableCode,
    },
    branch: {
      id: table.branch.id,
      name: table.branch.nameAr || table.branch.name,
      nameEn: table.branch.nameEn || table.branch.name,
    },
    restaurant: {
      id: restaurant.id,
      name: restaurant.nameAr || restaurant.name,
      nameEn: restaurant.nameEn || restaurant.name,
      logoUrl: restaurant.logoUrl,
      coverUrl: restaurant.coverUrl,
      primaryColor: restaurant.primaryColor,
      secondaryColor: restaurant.secondaryColor,
      backgroundColor: restaurant.backgroundColor,
      buttonColor: restaurant.buttonColor,
      textColor: restaurant.textColor,
      categoryColor: restaurant.categoryColor,
      fontFamily: restaurant.fontFamily,
      slug: restaurant.slug,
      whatsappNumber: restaurant.whatsappNumber,
    },
    categories: restaurant.menuCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      color: cat.color || defaultCategoryColor,
      icon: cat.icon,
      imageUrl: cat.imageUrl,
      videoUrl: cat.videoUrl,
      mediaType: cat.mediaType,
      previewUrl: cat.previewUrl,
      layout: cat.layout,
      items: cat.items.map(mapItem),
      children: cat.children.map((sub) => ({
        id: sub.id,
        name: sub.name,
        nameAr: sub.nameAr,
        nameEn: sub.nameEn,
        color: sub.color || defaultCategoryColor,
        icon: sub.icon,
        imageUrl: sub.imageUrl,
        videoUrl: sub.videoUrl,
        mediaType: sub.mediaType,
        previewUrl: sub.previewUrl,
        layout: sub.layout,
        items: sub.items.map(mapItem),
      })),
    })),
    suggestedItems: suggested,
  });
}
