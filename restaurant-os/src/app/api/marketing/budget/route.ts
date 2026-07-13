import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getBudgetScenarios, saveBudgetScenario } from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  return NextResponse.json(await getBudgetScenarios(restaurantId!));
}

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const body = await req.json();
  const daily = Number(body.daily) || 500;
  const weekly = Number(body.weekly) || daily * 7;
  const monthly = Number(body.monthly) || daily * 30;
  const result = await saveBudgetScenario(restaurantId!, {
    daily,
    weekly,
    monthly,
    goal: body.goal,
  });
  return NextResponse.json(result);
}
