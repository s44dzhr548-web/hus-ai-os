import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingCenterAccess } from "@/lib/marketing-center/auth";
import { distributeBudget } from "@/lib/marketing-center/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;

  const budget = await prisma.marketingBudget.findFirst({
    where: { restaurantId: restaurantId! },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    daily: Number(budget?.dailyBudget ?? 500),
    weekly: Number(budget?.weeklyBudget ?? 3500),
    monthly: Number(budget?.monthlyBudget ?? 15000),
    distribution: budget?.distributionJson ?? distributeBudget(500),
    note: "AI recommendation only — Phase 1",
  });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;

  const body = await req.json();
  const daily = Number(body.daily ?? 500);
  const weekly = Number(body.weekly ?? daily * 7);
  const monthly = Number(body.monthly ?? daily * 30);
  const distribution = distributeBudget(daily);

  const existing = await prisma.marketingBudget.findFirst({
    where: { restaurantId: restaurantId! },
  });

  const budget = existing
    ? await prisma.marketingBudget.update({
        where: { id: existing.id },
        data: { dailyBudget: daily, weeklyBudget: weekly, monthlyBudget: monthly, distributionJson: distribution },
      })
    : await prisma.marketingBudget.create({
        data: {
          restaurantId: restaurantId!,
          dailyBudget: daily,
          weeklyBudget: weekly,
          monthlyBudget: monthly,
          distributionJson: distribution,
        },
      });

  return NextResponse.json({
    daily: Number(budget.dailyBudget),
    weekly: Number(budget.weeklyBudget),
    monthly: Number(budget.monthlyBudget),
    distribution,
  });
}
