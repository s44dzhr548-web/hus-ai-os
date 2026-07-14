import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  ADS_INTEGRATION_KEYS,
  type AdsIntegrationKey,
  getAdsIntegrationsAdminView,
  saveAdsIntegration,
  testAdsIntegration,
} from "@/lib/platform/ads-integrations";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;
  return NextResponse.json(await getAdsIntegrationsAdminView());
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const platformKey = String(body.platformKey || "").toUpperCase() as AdsIntegrationKey;
  if (!ADS_INTEGRATION_KEYS.includes(platformKey)) {
    return NextResponse.json({ error: "منصة غير مدعومة" }, { status: 400 });
  }

  await saveAdsIntegration(platformKey, {
    displayName: body.displayName,
    clientId: body.clientId,
    clientSecret: body.clientSecret,
    webhookVerifyToken: body.webhookVerifyToken,
    redirectUriOverride: body.redirectUriOverride,
    webhookUrlOverride: body.webhookUrlOverride,
    oauthScopes: body.oauthScopes,
    isEnabled: body.isEnabled,
    userId: session!.user.id,
  });

  return NextResponse.json({ ok: true, ...(await getAdsIntegrationsAdminView()) });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const action = body.action as string;
  const platformKey = String(body.platformKey || "").toUpperCase() as AdsIntegrationKey;

  if (action === "test_connection" && ADS_INTEGRATION_KEYS.includes(platformKey)) {
    const result = await testAdsIntegration(platformKey);
    return NextResponse.json(result);
  }

  if (action === "dismiss_alert" && body.id) {
    await prisma.platformAdminAlert.updateMany({ where: { id: body.id }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
