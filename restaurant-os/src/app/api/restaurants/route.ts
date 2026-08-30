import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { updateRestaurantFromBody } from "@/lib/restaurant-settings-update";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: session!.user.id },
    include: {
      branches: { where: { isActive: true } },
      subscription: true,
      _count: { select: { staff: true, menuCategories: true } },
    },
  });

  return NextResponse.json(restaurants);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { name, nameAr, description, phone, email, taxNumber } = body;

  if (!name) {
    return NextResponse.json({ error: "اسم المطعم مطلوب" }, { status: 400 });
  }

  const slug = slugify(name) + "-" + Date.now().toString(36);

  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId: session!.user.id,
      name,
      nameAr,
      slug,
      description,
      phone,
      email,
      taxNumber,
      subscription: {
        create: { plan: "FREE", status: "TRIAL" },
      },
    },
  });

  return NextResponse.json(restaurant, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح", code: "INVALID_JSON" }, { status: 400 });
  }

  return updateRestaurantFromBody(restaurantId!, body);
}
