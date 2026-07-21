import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  getPlatformMetaAdminView,
  savePlatformMetaConfig,
  testPlatformMetaConnection,
  runPlatformMetaHealthCheck,
} from "@/lib/platform/meta-config";
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
  const { error } = await requirePlatformAdmin();
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

    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  } catch (e) {
    console.error("[platform/meta POST]", e);
    const msg = e instanceof Error ? e.message : "فشل تنفيذ الإجراء";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
