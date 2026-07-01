import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { normalizeHex } from "@/lib/colors";

export const dynamic = "force-dynamic";

const COLOR_KEYS = [
  "primaryColor",
  "secondaryColor",
  "backgroundColor",
  "buttonColor",
  "textColor",
  "categoryColor",
] as const;

export async function GET() {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId! },
    select: {
      logoUrl: true,
      coverUrl: true,
      primaryColor: true,
      secondaryColor: true,
      backgroundColor: true,
      buttonColor: true,
      textColor: true,
      categoryColor: true,
      fontFamily: true,
      name: true,
      nameAr: true,
    },
  });

  return NextResponse.json(restaurant);
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const body = await req.json();
  const data: Record<string, string | null> = {};

  for (const key of [
    "logoUrl",
    "coverUrl",
    "fontFamily",
    ...COLOR_KEYS,
  ] as const) {
    if (body[key] !== undefined) {
      data[key] =
        COLOR_KEYS.includes(key as (typeof COLOR_KEYS)[number])
          ? normalizeHex(String(body[key]))
          : body[key];
    }
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId! },
    data,
  });

  return NextResponse.json({
    logoUrl: updated.logoUrl,
    coverUrl: updated.coverUrl,
    primaryColor: updated.primaryColor,
    secondaryColor: updated.secondaryColor,
    backgroundColor: updated.backgroundColor,
    buttonColor: updated.buttonColor,
    textColor: updated.textColor,
    categoryColor: updated.categoryColor,
    fontFamily: updated.fontFamily,
  });
}
