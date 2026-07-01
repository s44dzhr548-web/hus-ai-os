import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { resetOwnerPassword } from "@/lib/owner-setup";
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
    include: { owner: { select: { id: true, email: true } } },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const tempPassword = await resetOwnerPassword(restaurant.owner.id);

  await logPlatformAudit({
    userId: session!.user.id,
    restaurantId,
    action: "PLATFORM_RESET_OWNER_PASSWORD",
    entity: "User",
    entityId: restaurant.owner.id,
    metadata: { ownerEmail: restaurant.owner.email },
  });

  return NextResponse.json({
    ownerEmail: restaurant.owner.email,
    tempPassword,
    message: "تم إنشاء كلمة مرور مؤقتة جديدة",
  });
}
