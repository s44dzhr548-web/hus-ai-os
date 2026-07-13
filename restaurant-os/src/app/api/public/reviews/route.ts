import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, rating, comment, tableId } = body;

  if (!slug || !rating) {
    return NextResponse.json({ error: "التقييم مطلوب" }, { status: 400 });
  }

  const stars = parseInt(String(rating), 10);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "التقييم يجب أن يكون من 1 إلى 5" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!restaurant?.isActive) {
    return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
  }

  if (tableId) {
    const table = await prisma.diningTable.findFirst({
      where: {
        id: tableId,
        branch: { restaurantId: restaurant.id },
      },
      select: { id: true },
    });
    if (!table) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 400 });
    }
  }

  const review = await prisma.review.create({
    data: {
      restaurantId: restaurant.id,
      rating: stars,
      comment: typeof comment === "string" ? comment.trim().slice(0, 1000) : null,
    },
  });

  return NextResponse.json(
    { id: review.id, message: "شكراً لتقييمك!" },
    { status: 201 }
  );
}
