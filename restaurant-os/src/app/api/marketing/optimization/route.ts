import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { generateOptimizations } from "@/lib/marketing/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const recommendations = await prisma.marketingAiRecommendation.findMany({
    where: { restaurantId: restaurantId!, isApplied: false },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  return NextResponse.json({ recommendations });
}

export async function POST() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const recommendations = await generateOptimizations(restaurantId!);
  return NextResponse.json({ recommendations });
}
