import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRestaurant, requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { assertFeature } from "@/lib/permissions-engine";

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

  const body = await req.json();

  if (body.customDomain !== undefined) {
    const domainCheck = await assertFeature(restaurantId!, "customDomain");
    if (domainCheck) return domainCheck;
  }

  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId! },
    data: {
      name: body.name,
      nameAr: body.nameAr,
      description: body.description,
      phone: body.phone,
      email: body.email,
      taxNumber: body.taxNumber,
      logoUrl: body.logoUrl,
      address: body.address,
      addressAr: body.addressAr,
      workingHours: body.workingHours,
      customDomain: body.customDomain,
      timezone: body.timezone,
      currency: body.currency,
    },
  });

  return NextResponse.json(restaurant);
}
