import { NextResponse } from "next/server";
import { requireMarketingCenterAccess } from "@/lib/marketing-center/auth";
import { getMarketingCenterHome } from "@/lib/marketing-center/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;
  const home = await getMarketingCenterHome(restaurantId!);
  return NextResponse.json(home);
}
