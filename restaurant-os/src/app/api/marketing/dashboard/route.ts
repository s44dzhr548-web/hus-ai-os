import { NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getMarketingDashboardMetrics } from "@/lib/marketing/dashboard-metrics";
import { checkRateLimit } from "@/lib/marketing/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  if (!checkRateLimit(restaurantId!)) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }
  const metrics = await getMarketingDashboardMetrics(restaurantId!);
  return NextResponse.json(metrics);
}
