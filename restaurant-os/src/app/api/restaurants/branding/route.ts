import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantFromRequest } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { normalizeHex } from "@/lib/colors";
import {
  parseHomepageSections,
  serializeHomepageSections,
} from "@/lib/homepage-sections";
import { parseLandingPageConfig } from "@/lib/landing-page-config";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const COLOR_KEYS = [
  "primaryColor",
  "secondaryColor",
  "backgroundColor",
  "buttonColor",
  "textColor",
  "categoryColor",
] as const;

const STRING_KEYS = [
  "logoUrl",
  "coverUrl",
  "heroVideoUrl",
  "heroImageUrl",
  "welcomeText",
  "welcomeTextEn",
  "ctaText",
  "ctaTextEn",
  "cardStyle",
  "fontFamily",
] as const;

function brandingResponse(row: Record<string, unknown>) {
  return {
    logoUrl: row.logoUrl,
    coverUrl: row.coverUrl,
    heroVideoUrl: row.heroVideoUrl,
    heroImageUrl: row.heroImageUrl,
    welcomeText: row.welcomeText,
    welcomeTextEn: row.welcomeTextEn,
    ctaText: row.ctaText,
    ctaTextEn: row.ctaTextEn,
    cardStyle: row.cardStyle,
    homepageSections: parseHomepageSections(row.homepageSections),
    landingPageConfig: parseLandingPageConfig(row.landingPageConfig),
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    backgroundColor: row.backgroundColor,
    buttonColor: row.buttonColor,
    textColor: row.textColor,
    categoryColor: row.categoryColor,
    fontFamily: row.fontFamily,
    name: row.name,
    nameAr: row.nameAr,
  };
}

export async function GET(req: NextRequest) {
  const { restaurantId, error, isPlatformAdmin } = await requireRestaurantFromRequest(req);
  if (error) return error;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId! },
    select: {
      id: true,
      ownerId: true,
      logoUrl: true,
      coverUrl: true,
      heroVideoUrl: true,
      heroImageUrl: true,
      welcomeText: true,
      welcomeTextEn: true,
      ctaText: true,
      ctaTextEn: true,
      cardStyle: true,
      homepageSections: true,
      landingPageConfig: true,
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

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    ...brandingResponse(restaurant as Record<string, unknown>),
    restaurantId: restaurant.id,
    canEditAll: isPlatformAdmin,
  });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, session, error, isPlatformAdmin } =
    await requireRestaurantFromRequest(req);
  if (error) return error;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const key of STRING_KEYS) {
    if (body[key] !== undefined) {
      data[key] = body[key] === "" ? null : String(body[key]);
    }
  }

  for (const key of COLOR_KEYS) {
    if (body[key] !== undefined) {
      data[key] = normalizeHex(String(body[key]));
    }
  }

  if (body.homepageSections !== undefined) {
    const parsed = parseHomepageSections(body.homepageSections);
    data.homepageSections = serializeHomepageSections(parsed);
  }

  if (body.landingPageConfig !== undefined) {
    data.landingPageConfig = parseLandingPageConfig(body.landingPageConfig);
  }

  if (body.cardStyle !== undefined) {
    const style = String(body.cardStyle);
    data.cardStyle = ["glass", "solid", "outline"].includes(style) ? style : "glass";
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId! },
    data,
  });

  await logAudit({
    userId: session!.user.id,
    restaurantId: restaurantId!,
    action: isPlatformAdmin ? "PLATFORM_UPDATE_BRANDING" : "UPDATE_BRANDING",
    entity: "Restaurant",
    entityId: restaurantId!,
  });

  return NextResponse.json(brandingResponse(updated as Record<string, unknown>));
}
