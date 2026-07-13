import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingCenterAccess } from "@/lib/marketing-center/auth";
import { ensureMarketingCenterSeed } from "@/lib/marketing-center/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;
  await ensureMarketingCenterSeed(restaurantId!);

  const [platforms, analytics, decisions] = await Promise.all([
    prisma.mcPlatformConfig.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.marketingAnalytics.findFirst({
      where: { restaurantId: restaurantId! },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.marketingDecision.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    platforms: platforms.map((p) => ({
      ...p,
      budgetAllocated: Number(p.budgetAllocated ?? 0),
      spent: Number(p.spent ?? 0),
      expectedRevenue: Number(p.expectedRevenue ?? 0),
      expectedProfit: Number(p.expectedProfit ?? 0),
    })),
    analytics,
    decisions: decisions.map((d) => ({ ...d, amount: Number(d.amount) })),
  });
}
