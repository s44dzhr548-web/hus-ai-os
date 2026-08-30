import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BRANDING_SELECT } from "@/lib/restaurant-branding";
import { validateGoogleMapsEmbedSrc } from "@/lib/google-maps-embed";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      logoUrl: true,
      phone: true,
      whatsappNumber: true,
      address: true,
      addressAr: true,
      googleMapsEmbedSrc: true,
      primaryColor: true,
      workingHours: true,
      landingPageConfig: true,
      timezone: true,
      receptionDepositAmount: true,
      isActive: true,
    },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  let googleMapsEmbedSrc: string | null = null;
  if (restaurant.googleMapsEmbedSrc) {
    const v = validateGoogleMapsEmbedSrc(restaurant.googleMapsEmbedSrc);
    if (v.ok && v.src) googleMapsEmbedSrc = v.src;
  }

  return NextResponse.json({
    ...restaurant,
    googleMapsEmbedSrc,
    googleMapsEmbedUrl: googleMapsEmbedSrc,
  });
}
