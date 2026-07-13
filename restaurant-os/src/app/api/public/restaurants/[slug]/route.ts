import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BRANDING_SELECT } from "@/lib/restaurant-branding";

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
      logoUrl: true,
      phone: true,
      whatsappNumber: true,
      address: true,
      addressAr: true,
      primaryColor: true,
      isActive: true,
    },
  });

  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}
