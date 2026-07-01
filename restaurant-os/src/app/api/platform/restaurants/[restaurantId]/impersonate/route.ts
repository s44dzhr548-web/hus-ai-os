import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { createImpersonationToken } from "@/lib/impersonate";
import { logPlatformAudit } from "@/lib/platform-audit";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, ownerId: true, name: true, nameAr: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const token = createImpersonationToken(
    restaurant.ownerId,
    restaurant.id,
    session!.user.id
  );

  await logPlatformAudit({
    userId: session!.user.id,
    restaurantId,
    action: "PLATFORM_IMPERSONATE_OWNER",
    entity: "Restaurant",
    entityId: restaurantId,
  });

  return NextResponse.json({
    token,
    restaurantId: restaurant.id,
    restaurantName: restaurant.nameAr || restaurant.name,
    dashboardUrl: "/dashboard",
  });
}
