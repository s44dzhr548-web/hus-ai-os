import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { buildRestaurantLinks } from "@/lib/restaurant-links";
import { logPlatformAudit } from "@/lib/platform-audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      subscription: true,
      branches: { orderBy: { createdAt: "asc" }, take: 1 },
      staff: {
        where: { role: "OWNER" },
        take: 1,
        select: { role: true },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  const branch = restaurant.branches[0];
  const table = branch
    ? await prisma.diningTable.findFirst({
        where: { branchId: branch.id },
        orderBy: { number: "asc" },
      })
    : null;

  const links = buildRestaurantLinks({
    slug: restaurant.slug,
    tableId: table?.id,
    tableCode: table?.tableCode,
    qrCode: table?.qrCode,
    branchId: branch?.id,
  });

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.nameAr || restaurant.name,
      nameEn: restaurant.nameEn || restaurant.name,
      slug: restaurant.slug,
      logoUrl: restaurant.logoUrl,
      plan: restaurant.subscription?.plan ?? "FREE",
      status: restaurant.subscription?.status ?? "TRIAL",
    },
    owner: {
      id: restaurant.owner.id,
      name: restaurant.owner.name,
      email: restaurant.owner.email,
      role: restaurant.staff[0]?.role ?? "OWNER",
    },
    branch: branch
      ? { id: branch.id, name: branch.nameAr || branch.name }
      : null,
    table: table
      ? { id: table.id, number: table.number, tableCode: table.tableCode }
      : null,
    links,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;
  const body = await req.json();
  const data: Record<string, string | null | boolean> = {};

  for (const key of [
    "logoUrl",
    "coverUrl",
    "primaryColor",
    "secondaryColor",
    "backgroundColor",
    "buttonColor",
    "textColor",
    "fontFamily",
  ] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data,
  });

  const auditAction =
    body.isActive === false
      ? "PLATFORM_SUSPEND_RESTAURANT"
      : body.isActive === true
        ? "PLATFORM_UNSUSPEND_RESTAURANT"
        : "PLATFORM_UPDATE_BRANDING";

  await logPlatformAudit({
    userId: session!.user.id,
    restaurantId,
    action: auditAction,
    entity: "Restaurant",
    entityId: restaurantId,
    metadata: body.isActive !== undefined ? { isActive: body.isActive } : undefined,
  });

  return NextResponse.json({
    logoUrl: updated.logoUrl,
    coverUrl: updated.coverUrl,
    primaryColor: updated.primaryColor,
    fontFamily: updated.fontFamily,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const { restaurantId } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, nameAr: true, ownerId: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  await prisma.restaurant.delete({ where: { id: restaurantId } });

  await logPlatformAudit({
    userId: session!.user.id,
    restaurantId,
    action: "PLATFORM_DELETE_RESTAURANT",
    entity: "Restaurant",
    entityId: restaurantId,
    metadata: {
      restaurantName: restaurant.nameAr || restaurant.name,
      ownerId: restaurant.ownerId,
    },
  });

  return NextResponse.json({ deleted: true, restaurantId });
}
