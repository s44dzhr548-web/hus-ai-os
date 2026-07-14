import { NextRequest, NextResponse } from "next/server";
import {
  requireAdsPlatformConnectAccess,
  requireAdsPlatformReadAccess,
} from "@/lib/marketing/auth";
import { getOwnerPlatformCards, syncRestaurantAds } from "@/lib/marketing/ads-sync";
import { notifyPlatformAdminAdsSetup } from "@/lib/platform/ads-integrations";
import { ownerPlatformByKey } from "@/lib/marketing/ads-platforms";
import prisma from "@/lib/prisma";
import type { MarketingPlatform } from "@prisma/client";
import { logMarketingAudit } from "@/lib/marketing/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId, canConnect, canEdit } = await requireAdsPlatformReadAccess();
  if (error) return error;

  const platforms = await getOwnerPlatformCards(restaurantId!);
  return NextResponse.json({ platforms, permissions: { canConnect, canEdit } });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session, canConnect } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const body = await req.json();
  const action = body.action as string;
  const platform = String(body.platform || "").toUpperCase() as MarketingPlatform;
  const def = ownerPlatformByKey(platform);

  if (action === "disconnect") {
    await prisma.marketingAdConnection.updateMany({
      where: { restaurantId: restaurantId!, platform },
      data: {
        isActive: false,
        accessTokenEnc: null,
        refreshTokenEnc: null,
        syncStatus: "DISCONNECTED",
      },
    });
    await logMarketingAudit({
      restaurantId: restaurantId!,
      userId: session?.user?.id,
      action: "ADS_DISCONNECT",
      entityType: "MarketingAdConnection",
      details: { platform },
    });
    return NextResponse.json({ ok: true, platforms: await getOwnerPlatformCards(restaurantId!) });
  }

  if (action === "sync") {
    const results = await syncRestaurantAds(restaurantId!, platform);
    return NextResponse.json({ ok: true, results, platforms: await getOwnerPlatformCards(restaurantId!) });
  }

  if (action === "notify_admin") {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId! },
      select: { name: true, nameAr: true },
    });
    const name = restaurant?.nameAr || restaurant?.name || "مطعم";
    await notifyPlatformAdminAdsSetup(restaurantId!, name, def?.labelAr || platform);
    return NextResponse.json({ ok: true, message: "تم إرسال إشعار لمسؤول المنصة" });
  }

  if (action === "recheck") {
    return NextResponse.json({ platforms: await getOwnerPlatformCards(restaurantId!) });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
