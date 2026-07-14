import { NextResponse } from "next/server";
import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";
import { getOAuthStartUrl, isOAuthConfigured } from "@/lib/marketing/ads-oauth";
import type { MarketingPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params;
  const { error, restaurantId } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const platform = platformParam.toUpperCase() as MarketingPlatform;

  if (!(await isOAuthConfigured(platform))) {
    return NextResponse.json(
      { error: "خدمة الربط غير مفعّلة بعد — تواصل مع مسؤول المنصة", ready: false },
      { status: 503 }
    );
  }

  const url = await getOAuthStartUrl(platform, restaurantId!);
  if (!url) {
    return NextResponse.json({ error: "تعذّر بدء الربط", ready: false }, { status: 503 });
  }

  return NextResponse.redirect(url);
}
