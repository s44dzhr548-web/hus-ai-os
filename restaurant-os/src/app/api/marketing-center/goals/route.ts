import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingCenterAccess } from "@/lib/marketing-center/auth";
import { GOAL_OPTIONS } from "@/lib/marketing-center/constants";
import type { MarketingGoalType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;

  const active = await prisma.marketingGoal.findMany({
    where: { restaurantId: restaurantId!, isActive: true },
  });

  return NextResponse.json({
    options: GOAL_OPTIONS,
    active: active.map((g) => g.goalType),
  });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;

  const body = await req.json();
  const goals = (body.goals as MarketingGoalType[]) || [];

  await prisma.marketingGoal.updateMany({
    where: { restaurantId: restaurantId! },
    data: { isActive: false },
  });

  for (const goalType of goals) {
    await prisma.marketingGoal.upsert({
      where: { restaurantId_goalType: { restaurantId: restaurantId!, goalType } },
      create: { restaurantId: restaurantId!, goalType, isActive: true },
      update: { isActive: true },
    });
  }

  return NextResponse.json({ active: goals });
}
