import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;
  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const notifications = await prisma.receptionNotification.findMany({
    where: { restaurantId: restaurantId!, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const body = await req.json();
  if (body.markAllRead) {
    await prisma.receptionNotification.updateMany({
      where: { restaurantId: restaurantId!, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await prisma.receptionNotification.updateMany({
      where: { id: body.id, restaurantId: restaurantId! },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 });
}
