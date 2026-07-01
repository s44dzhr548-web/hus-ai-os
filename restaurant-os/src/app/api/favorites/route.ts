import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const guestToken = req.nextUrl.searchParams.get("guestToken");

  if (!restaurantId || !guestToken) {
    return NextResponse.json([]);
  }

  const favorites = await prisma.customerFavorite.findMany({
    where: { restaurantId, guestToken },
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          nameEn: true,
          price: true,
          discountPrice: true,
          imageUrl: true,
        },
      },
    },
  });

  return NextResponse.json(favorites.map((f) => f.menuItem));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { restaurantId, menuItemId, guestToken } = body;

  if (!restaurantId || !menuItemId || !guestToken) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const existing = await prisma.customerFavorite.findFirst({
    where: { guestToken, menuItemId },
  });

  if (existing) {
    await prisma.customerFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.customerFavorite.create({
    data: { restaurantId, menuItemId, guestToken },
  });

  return NextResponse.json({ favorited: true });
}
