import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingCenterAccess } from "@/lib/marketing-center/auth";
import { ensureMarketingCenterSeed } from "@/lib/marketing-center/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;
  await ensureMarketingCenterSeed(restaurantId!);

  const recommendations = await prisma.marketingRecommendation.findMany({
    where: { restaurantId: restaurantId!, isActive: true },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ recommendations });
}
