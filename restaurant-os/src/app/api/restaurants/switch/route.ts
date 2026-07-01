import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  ACTIVE_RESTAURANT_COOKIE,
  isPlatformAdminUser,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const where = isPlatformAdminUser(session!.user)
    ? {}
    : {
        OR: [
          { ownerId: session!.user.id },
          { staff: { some: { userId: session!.user.id, isActive: true } } },
        ],
      };

  const restaurants = await prisma.restaurant.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
      logoUrl: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(restaurants);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { restaurantId } = await req.json();
  if (!restaurantId) {
    return NextResponse.json({ error: "معرف المطعم مطلوب" }, { status: 400 });
  }

  const platformAdmin = isPlatformAdminUser(session!.user);

  const restaurant = platformAdmin
    ? await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    : await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          OR: [
            { ownerId: session!.user.id },
            { staff: { some: { userId: session!.user.id, isActive: true } } },
          ],
        },
      });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  if (platformAdmin) {
    await logAudit({
      userId: session!.user.id,
      restaurantId: restaurant.id,
      action: "PLATFORM_SWITCH_RESTAURANT",
      entity: "Restaurant",
      entityId: restaurant.id,
      metadata: { restaurantName: restaurant.nameAr || restaurant.name },
    });
  }

  const response = NextResponse.json({
    restaurantId: restaurant.id,
    restaurantName: restaurant.nameAr || restaurant.name,
  });

  if (platformAdmin) {
    response.cookies.set(ACTIVE_RESTAURANT_COOKIE, restaurant.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}
