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

function serializeStaff(row: {
  id: string;
  userId: string;
  restaurantId: string;
  role: StaffRole;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string };
}) {
  return {
    id: row.id,
    userId: row.userId,
    restaurantId: row.restaurantId,
    role: row.role,
    name: row.name,
    email: row.user.email,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(STAFF_MANAGER_ROLES);
  if (error) return error;

  const staff = await prisma.staff.findMany({
    where: {
      restaurantId: restaurantId!,
      role: { not: "OWNER" },
    },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    staff: staff.map(serializeStaff),
  });
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(STAFF_MANAGER_ROLES);
  if (error) return error;

  const body = await req.json();
  const {
    name,
    email,
    phone,
    password,
    role = "RECEPTION",
    isActive = true,
  } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: "الاسم والبريد وكلمة المرور مطلوبة" },
      { status: 400 }
    );
  }

  if (!ASSIGNABLE_ROLES.includes(role as StaffRole)) {
    return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
  }

  if (String(password).length < 8) {
    return NextResponse.json(
      { error: "كلمة المرور 8 أحرف على الأقل" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingMember = await prisma.staff.findFirst({
    where: { restaurantId: restaurantId!, user: { email: normalizedEmail } },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "هذا الموظف مسجل بالفعل في المطعم" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(String(password), 12);

  const staff = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name.trim(),
        },
      });
    } else {
      await tx.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
      });
    }

    return tx.staff.create({
      data: {
        userId: user.id,
        restaurantId: restaurantId!,
        role: role as StaffRole,
        name: name.trim(),
        phone: phone?.trim() || null,
        isActive: Boolean(isActive),
      },
      include: { user: { select: { email: true } } },
    });
  });

  return NextResponse.json(serializeStaff(staff), { status: 201 });
}
