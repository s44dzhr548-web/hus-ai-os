import { NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getMarketingForecast } from "@/lib/marketing/forecast";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const forecast = await getMarketingForecast(restaurantId!);
  return NextResponse.json(forecast);
}
