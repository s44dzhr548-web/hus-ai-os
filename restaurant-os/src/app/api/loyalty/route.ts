import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const loyaltyCheck = await assertFeature(restaurantId!, "loyalty");
  if (loyaltyCheck) return loyaltyCheck;

  const [customers, coupons, points] = await Promise.all([
    prisma.customer.findMany({
      where: { restaurantId: restaurantId! },
      include: {
        loyaltyPoints: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.coupon.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loyaltyPoint.aggregate({
      where: { customer: { restaurantId: restaurantId! } },
      _sum: { points: true },
    }),
  ]);

  const customersWithPoints = customers.map((c) => ({
    ...c,
    totalPoints: c.loyaltyPoints.reduce((sum, p) => sum + p.points, 0),
  }));

  return NextResponse.json({
    customers: customersWithPoints,
    coupons,
    totalPointsIssued: points._sum.points ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const loyaltyCheck = await assertFeature(restaurantId!, "loyalty");
  if (loyaltyCheck) return loyaltyCheck;

  const body = await req.json();
  const { type, code, value, minOrder, maxUses, expiresAt } = body;

  if (type === "coupon") {
    if (!code || value == null) {
      return NextResponse.json({ error: "كود الكوبون والقيمة مطلوبان" }, { status: 400 });
    }
    const coupon = await prisma.coupon.create({
      data: {
        restaurantId: restaurantId!,
        code,
        type: body.couponType || "PERCENTAGE",
        value,
        minOrder,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
    return NextResponse.json(coupon, { status: 201 });
  }

  return NextResponse.json({ error: "نوع غير مدعوم" }, { status: 400 });
}
