import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  getPlatformMetaAdminView,
  savePlatformMetaConfig,
  testPlatformMetaConnection,
  runPlatformMetaHealthCheck,
} from "@/lib/platform/meta-config";
import { probeWhatsAppPlatformAccess } from "@/lib/marketing/whatsapp-platform-probe";
import { connectRestaurantFromPlatformDiscovery } from "@/lib/marketing/whatsapp-connection-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  try {
    const skipHealth = req.nextUrl.searchParams.get("health") === "0";
    const view = await getPlatformMetaAdminView({ skipHealth });
    return NextResponse.json(view);
  } catch (e) {
    console.error("[platform/meta GET]", e);
    const msg = e instanceof Error ? e.message : "فشل تحميل الإعدادات";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const saveResult = await savePlatformMetaConfig({
      facebookAppName: body.facebookAppName,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      webhookVerifyToken: body.webhookVerifyToken,
      whatsappAccessToken: body.whatsappAccessToken,
      metaBusinessId: body.metaBusinessId,
      userId: session!.user.id,
    });

    const view = await getPlatformMetaAdminView({ skipHealth: true });
    return NextResponse.json({ ok: true, connectionTest: saveResult.connectionTest, ...view });
  } catch (e) {
    console.error("[platform/meta PATCH]", e);
    const msg = e instanceof Error ? e.message : "فشل حفظ الإعدادات";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "test_connection") {
      const token =
        typeof body.whatsappAccessToken === "string" ? body.whatsappAccessToken : undefined;
      const result = await testPlatformMetaConnection(token);
      const health = await runPlatformMetaHealthCheck();
      return NextResponse.json({ ...result, health });
    }

    if (action === "dismiss_alert" && body.id) {
      await prisma.platformAdminAlert.updateMany({
        where: { id: body.id },
        data: { isRead: true },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "refresh_health") {
      const health = await runPlatformMetaHealthCheck();
      return NextResponse.json({ health });
    }

    if (action === "probe_whatsapp") {
      const restaurantSlug = String(body.restaurantSlug || "fabrika-mqkat9dw");
      const restaurant = await prisma.restaurant.findFirst({
        where: { slug: restaurantSlug },
        select: { id: true },
      });
      const connection = restaurant
        ? await prisma.whatsAppBusinessConnection.findUnique({ where: { restaurantId: restaurant.id } })
        : null;
      const probe = await probeWhatsAppPlatformAccess({
        wabaId: connection?.wabaId || undefined,
        phoneNumberId: connection?.phoneNumberId || undefined,
      });
      return NextResponse.json(probe);
    }

    if (action === "link_restaurant_whatsapp") {
      const restaurantSlug = String(body.restaurantSlug || "fabrika-mqkat9dw");
      const restaurant = await prisma.restaurant.findFirst({
        where: { slug: restaurantSlug },
        select: { id: true, name: true, nameAr: true },
      });
      if (!restaurant) {
        return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      }
      try {
        const result = await connectRestaurantFromPlatformDiscovery(restaurant.id, {
          nameHint: restaurant.nameAr || restaurant.name,
          connectedByUserId: session!.user.id,
        });
        const connection = await prisma.whatsAppBusinessConnection.findUnique({
          where: { restaurantId: restaurant.id },
        });
        return NextResponse.json({
          ok: true,
          result,
          connection: connection
            ? {
                metaBusinessId: connection.metaBusinessId,
                wabaId: connection.wabaId,
                phoneNumberId: connection.phoneNumberId,
                displayPhoneNumber: connection.businessPhone,
                connectionStatus: connection.connectionStatus,
              }
            : null,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Link failed" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  } catch (e) {
    console.error("[platform/meta POST]", e);
    const msg = e instanceof Error ? e.message : "فشل تنفيذ الإجراء";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
