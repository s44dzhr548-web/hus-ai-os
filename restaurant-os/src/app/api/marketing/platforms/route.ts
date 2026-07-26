import { NextRequest, NextResponse } from "next/server";
import {
  requireAdsPlatformConnectAccess,
  requireAdsPlatformReadAccess,
} from "@/lib/marketing/auth";
import { getOwnerPlatformCards, syncRestaurantAds } from "@/lib/marketing/ads-sync";
import {
  notifyPlatformAdminAdsSetup,
  isAdsIntegrationReady,
  testAdsIntegration,
} from "@/lib/platform/ads-integrations";
import { ownerPlatformByKey } from "@/lib/marketing/ads-platforms";
import { platformToIntegrationKey } from "@/lib/marketing/ads-oauth";
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
  const read = await requireAdsPlatformReadAccess();
  if (read.error) return read.error;

  const { restaurantId, session, canConnect } = read;
  const body = await req.json();
  const action = body.action as string;
  const platform = String(body.platform || "").toUpperCase() as MarketingPlatform;
  const def = ownerPlatformByKey(platform);

  if (action === "recheck" || action === "notify_admin") {
    if (action === "notify_admin") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId! },
        select: { name: true, nameAr: true },
      });
      const name = restaurant?.nameAr || restaurant?.name || "مطعم";
      const issue =
        body.issue?.trim() ||
        def?.labelAr ||
        platform;
      await notifyPlatformAdminAdsSetup(restaurantId!, name, issue);
      await logMarketingAudit({
        restaurantId: restaurantId!,
        userId: session?.user?.id,
        action: "ADS_NOTIFY_ADMIN",
        entityType: "MarketingPlatform",
        details: { platform, issue },
      });
      return NextResponse.json({
        ok: true,
        message: "تم إرسال إشعار لمسؤول المنصة",
        platforms: await getOwnerPlatformCards(restaurantId!),
      });
    }

    const key = platformToIntegrationKey(platform);
    let recheckStatus = "unknown";
    let recheckMessage = "";
    if (key) {
      const ready = await isAdsIntegrationReady(key);
      if (!ready) {
        recheckStatus = "pending_setup";
        recheckMessage = "ناقص إعداد";
      } else {
        const test = await testAdsIntegration(key);
        recheckStatus = test.ok ? "configured" : "connection_failed";
        recheckMessage = test.ok ? "مهيأ" : "فشل الاتصال";
      }
    }
    const cards = await getOwnerPlatformCards(restaurantId!);
    const card = cards.find((c) => c.key === platform);
    if (card?.status === "CONNECTED") {
      recheckStatus = "connected";
      recheckMessage = "متصل";
    }
    return NextResponse.json({
      ok: true,
      message: `${def?.labelAr || platform}: ${recheckMessage}`,
      recheckStatus,
      platforms: cards,
    });
  }

  const connect = await requireAdsPlatformConnectAccess();
  if (connect.error) return connect.error;

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

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
