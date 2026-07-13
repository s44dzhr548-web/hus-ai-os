import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { captureMetricsSnapshot, getLatestMetrics } from "@/lib/marketing/monitoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId") || undefined;
  const metrics = await getLatestMetrics(restaurantId!, campaignId);
  return NextResponse.json({ metrics });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const snapshot = await captureMetricsSnapshot(restaurantId!, body.campaignId);
  return NextResponse.json({ snapshot });
}
