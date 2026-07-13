import { NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getMarketingOverview } from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const data = await getMarketingOverview(restaurantId!);
  return NextResponse.json(data);
}
