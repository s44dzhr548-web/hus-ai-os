import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import type { StaffRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const STAFF_MANAGER_ROLES = ["OWNER", "ADMIN"];

const ASSIGNABLE_ROLES: StaffRole[] = [
  "RECEPTION",
  "MANAGER",
  "WAITER",
  "KITCHEN",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { restaurantId, error } = await requireRestaurantRole(STAFF_MANAGER_ROLES);
  if (error) return error;

  const staff = await prisma.staff.findFirst({
    where: { id, restaurantId: restaurantId!, role: { not: "OWNER" } },
    include: { user: true },
  });

  if (!staff) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    phone?: string | null;
    role?: StaffRole;
    isActive?: boolean;
  } = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
  if (body.role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(body.role as StaffRole)) {
      return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
    }
    data.role = body.role as StaffRole;
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  if (body.resetPassword) {
    if (!body.newPassword || String(body.newPassword).length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة 8 أحرف على الأقل" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: staff.userId },
      data: { passwordHash: await bcrypt.hash(String(body.newPassword), 12) },
    });
  }

  const updated = await prisma.staff.update({
    where: { id },
    data,
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    restaurantId: updated.restaurantId,
    role: updated.role,
    name: updated.name,
    email: updated.user.email,
    phone: updated.phone,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { restaurantId, error } = await requireRestaurantRole(STAFF_MANAGER_ROLES);
  if (error) return error;

  const staff = await prisma.staff.findFirst({
    where: { id, restaurantId: restaurantId!, role: { not: "OWNER" } },
  });

  if (!staff) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.staff.delete({ where: { id } });

    const [ownedCount, staffCount] = await Promise.all([
      tx.restaurant.count({ where: { ownerId: staff.userId } }),
      tx.staff.count({ where: { userId: staff.userId } }),
    ]);

    if (ownedCount === 0 && staffCount === 0) {
      await tx.user.delete({ where: { id: staff.userId } });
    }
  });

  return NextResponse.json({ ok: true });
}
