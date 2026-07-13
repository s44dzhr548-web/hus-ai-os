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

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const view = await getPlatformMetaAdminView();
  return NextResponse.json(view);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  await savePlatformMetaConfig({
    facebookAppName: body.facebookAppName,
    clientId: body.clientId,
    clientSecret: body.clientSecret,
    webhookVerifyToken: body.webhookVerifyToken,
    userId: session!.user.id,
  });

  const view = await getPlatformMetaAdminView();
  return NextResponse.json({ ok: true, ...view });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const action = body.action as string;

  if (action === "test_connection") {
    const result = await testPlatformMetaConnection();
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
}
