import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getOAuthStartUrl } from "@/lib/marketing/oauth";
import type { MarketingPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params;
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const platform = platformParam.toUpperCase() as MarketingPlatform;
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const url = getOAuthStartUrl(platform, restaurantId!, base);

  if (!url) {
    return NextResponse.json(
      {
        error: "OAuth غير مُعدّ لهذه المنصة. أضف بيانات الاعتماد في بيئة Staging.",
        platform,
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(url);
}
