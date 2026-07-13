import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { runSimulation } from "@/lib/marketing/service";
import { withMarketingDb, marketingDb } from "@/lib/marketing/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const body = await req.json();
  const result = runSimulation({
    budget: Number(body.budget) || 500,
    goal: body.goal,
    city: body.city,
    durationDays: Number(body.durationDays) || 1,
    timeOfDay: body.timeOfDay,
    isWeekend: body.isWeekend,
    restaurantType: body.restaurantType,
    averageOrderValue: Number(body.averageOrderValue) || 120,
    profitMargin: Number(body.profitMargin) || 32,
    existingCustomers: Number(body.existingCustomers) || 0,
    reservationConversionRate: Number(body.reservationConversionRate) || 0.35,
  });

  await withMarketingDb(
    () =>
      marketingDb().marketingSimulation?.create({
        data: {
          restaurantId: restaurantId!,
          inputBudget: Number(body.budget) || 500,
          resultsJson: result as object,
          expectedRevenue: result.totals.expectedRevenue,
          expectedProfit: result.totals.expectedNetProfit,
          expectedRoi: result.totals.expectedRoi,
        },
      }),
    undefined
  );

  return NextResponse.json(result);
}
