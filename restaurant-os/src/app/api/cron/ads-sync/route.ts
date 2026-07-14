import { NextRequest, NextResponse } from "next/server";
import { syncAllRestaurantsAds } from "@/lib/marketing/ads-sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllRestaurantsAds();
  return NextResponse.json({ success: true, ...result });
}
