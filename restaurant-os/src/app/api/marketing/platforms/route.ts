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
import {
  logGoogleAdsDeveloperTokenConfigured,
} from "@/lib/marketing/google-ads-developer-token";
import {
  googleAdsEnvPayload,
  readGoogleAdsDeveloperTokenConfiguredAtRuntime,
} from "@/lib/marketing/google-ads-env-runtime";
import {
  getGoogleBusinessPlatformCard,
  googleBusinessToMarketingCard,
} from "@/lib/google-business/platform-card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error, restaurantId, canConnect, canEdit } = await requireAdsPlatformReadAccess();
  if (error) return error;

  const googleAdsEnv = await googleAdsEnvPayload();
  logGoogleAdsDeveloperTokenConfigured("marketing_platforms_get", googleAdsEnv.developerTokenConfigured);
  const platforms = await getOwnerPlatformCards(restaurantId!, {
    googleAdsDeveloperTokenConfigured: googleAdsEnv.developerTokenConfigured,
  });
  const gbpCard = googleBusinessToMarketingCard(
    await getGoogleBusinessPlatformCard(restaurantId!)
  );
  return NextResponse.json({
    platforms: [...platforms, gbpCard],
    permissions: { canConnect, canEdit },
    googleAdsEnv,
  });
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
    logGoogleAdsDeveloperTokenConfigured("marketing_platforms_sync");
    const developerTokenConfigured = await readGoogleAdsDeveloperTokenConfiguredAtRuntime();
    const results = await syncRestaurantAds(restaurantId!, platform);
    const googleAdsEnv = { developerTokenConfigured };
    const platformOpts = { googleAdsDeveloperTokenConfigured: developerTokenConfigured };
    if (!results.length) {
      return NextResponse.json({
        ok: false,
        message: "لا يوجد اتصال نشط لهذه المنصة — اربط Google Ads ثم Sync Now",
        googleAdsEnv,
        results,
        platforms: await getOwnerPlatformCards(restaurantId!, platformOpts),
      });
    }
    const failed = results.filter((r) => !r.ok);
    const ok = failed.length === 0;
    return NextResponse.json({
      ok,
      message: ok
        ? "تمت المزامنة بنجاح"
        : failed.map((f) => f.error).filter(Boolean).join(" · ") || "فشلت المزامنة",
      googleAdsEnv,
      results,
      platforms: await getOwnerPlatformCards(restaurantId!, platformOpts),
    });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
