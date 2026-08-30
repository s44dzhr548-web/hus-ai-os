import { NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { listConnectedVideoProvidersForStudio } from "@/lib/marketing/video-studio-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const providers = await listConnectedVideoProvidersForStudio(restaurantId!);
  return NextResponse.json({ providers });
}
