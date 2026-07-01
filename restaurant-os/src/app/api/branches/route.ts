import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature, checkLimitAllowed } from "@/lib/permissions-engine";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const branches = await prisma.branch.findMany({
    where: { restaurantId: restaurantId! },
    include: {
      _count: { select: { tables: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const body = await req.json();
  const { name, nameAr, nameEn, address, addressAr, city, phone, workingHours } = body;

  const displayName = name || nameAr || nameEn;
  if (!displayName) {
    return NextResponse.json({ error: "اسم الفرع مطلوب" }, { status: 400 });
  }

  const existingCount = await prisma.branch.count({
    where: { restaurantId: restaurantId! },
  });
  if (existingCount >= 1) {
    const multiBranchCheck = await assertFeature(restaurantId!, "multiBranch");
    if (multiBranchCheck) return multiBranchCheck;
  }

  const limit = await checkLimitAllowed(restaurantId!, "branches");
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message, upgrade: true }, { status: 403 });
  }

  const branch = await prisma.branch.create({
    data: {
      restaurantId: restaurantId!,
      name: displayName,
      nameAr,
      nameEn,
      address,
      addressAr,
      city,
      phone,
      workingHours: workingHours ?? {
        sunday: { open: "09:00", close: "23:00" },
        monday: { open: "09:00", close: "23:00" },
        tuesday: { open: "09:00", close: "23:00" },
        wednesday: { open: "09:00", close: "23:00" },
        thursday: { open: "09:00", close: "23:00" },
        friday: { open: "14:00", close: "23:00" },
        saturday: { open: "09:00", close: "23:00" },
      },
    },
  });

  return NextResponse.json(branch, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "معرف الفرع مطلوب" }, { status: 400 });
  }

  const branch = await prisma.branch.updateMany({
    where: { id, restaurantId: restaurantId! },
    data,
  });

  return NextResponse.json({ updated: branch.count });
}
