import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireWhatsAppBusinessReadAccess,
  requireWhatsAppBusinessOwnerAccess,
} from "@/lib/marketing/auth";
import {
  fetchWizardState,
  saveWizardSelection,
  finalizeWizardConnection,
  verifyWizardWebhook,
  completeWizard,
  getOrCreateWizardSession,
  storePlatformDiscovery,
  completeEmbeddedSignup,
  connectRestaurantFromPlatformDiscovery,
} from "@/lib/marketing/whatsapp-setup";
import { syncTemplatesFromMeta } from "@/lib/marketing/whatsapp-business";
import { sendTestWhatsAppMessage } from "@/lib/after-visit-whatsapp/service";
import {
  isMetaOAuthReady,
  notifyPlatformAdminMetaSetup,
  resolveMetaCredentials,
} from "@/lib/platform/meta-config";
import { getEmbeddedSignupConfigId } from "@/lib/marketing/whatsapp-oauth";
import { verifyRestaurantWhatsAppLink } from "@/lib/marketing/whatsapp-connection-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId, canEdit } = await requireWhatsAppBusinessReadAccess();
  if (error) return error;

  const [state, notifications, oauthReady, creds] = await Promise.all([
    fetchWizardState(restaurantId!),
    prisma.whatsAppOwnerNotification.findMany({
      where: { restaurantId: restaurantId!, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    isMetaOAuthReady(),
    resolveMetaCredentials(),
  ]);

  return NextResponse.json({
    ...state,
    oauthReady: state.oauthReady,
    metaAppId: creds.clientId,
    embeddedSignupConfigId: getEmbeddedSignupConfigId(),
    metaOAuth: {
      ready: oauthReady && state.platformTokenReady,
      status: state.connection?.connected
        ? "CONNECTED"
        : oauthReady && state.platformTokenReady
          ? "READY"
          : "PENDING",
    },
    notifications,
    permissions: { canEdit },
  });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireWhatsAppBusinessOwnerAccess();
  if (error) return error;

  const body = await req.json();
  const action = body.action as string;

  if (action === "set_step") {
    await getOrCreateWizardSession(restaurantId!);
    await prisma.whatsAppWizardSession.update({
      where: { restaurantId: restaurantId! },
      data: { step: Number(body.step) || 1 },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "select_phone") {
    await saveWizardSelection(restaurantId!, String(body.phoneNumberId));
    return NextResponse.json({ ok: true, state: await fetchWizardState(restaurantId!) });
  }

  if (action === "save_connection") {
    const result = await finalizeWizardConnection(restaurantId!, session?.user?.id);
    return NextResponse.json({ ...result, state: await fetchWizardState(restaurantId!) });
  }

  if (action === "verify_webhook") {
    const result = await verifyWizardWebhook(restaurantId!);
    return NextResponse.json({ ...result, state: await fetchWizardState(restaurantId!) });
  }

  if (action === "sync_templates") {
    const templates = await syncTemplatesFromMeta(restaurantId!);
    await prisma.whatsAppWizardSession.update({
      where: { restaurantId: restaurantId! },
      data: { step: 7 },
    });
    return NextResponse.json({ templates, state: await fetchWizardState(restaurantId!) });
  }

  if (action === "test_send") {
    const testPhone = String(body.testPhone || "").trim();
    if (!testPhone) {
      return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 });
    }
    const result = await sendTestWhatsAppMessage({ restaurantId: restaurantId!, testPhone });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, status: "FAILED" }, { status: 400 });
    }
    await prisma.whatsAppWizardSession.update({
      where: { restaurantId: restaurantId! },
      data: { step: 8 },
    });
    return NextResponse.json({
      ok: true,
      status: "SENT",
      messageId: result.messageId,
      state: await fetchWizardState(restaurantId!),
    });
  }

  if (action === "finish") {
    await completeWizard(restaurantId!, body.features || {});
    return NextResponse.json({ ok: true, state: await fetchWizardState(restaurantId!) });
  }

  if (action === "dismiss_notification") {
    if (body.id) {
      await prisma.whatsAppOwnerNotification.updateMany({
        where: { id: body.id, restaurantId: restaurantId! },
        data: { isRead: true },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "notify_platform_admin") {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId! },
      select: { name: true, nameAr: true },
    });
    const name = restaurant?.nameAr || restaurant?.name || "مطعم";
    await notifyPlatformAdminMetaSetup(restaurantId!, name);
    return NextResponse.json({ ok: true, message: "تم إرسال إشعار لمسؤول المنصة" });
  }

  if (action === "recheck_oauth") {
    const state = await fetchWizardState(restaurantId!);
    return NextResponse.json({ oauthReady: state.oauthReady, platformTokenReady: state.platformTokenReady });
  }

  if (action === "discover_platform") {
    const discovered = await storePlatformDiscovery(restaurantId!);
    return NextResponse.json({
      ok: true,
      discovered,
      state: await fetchWizardState(restaurantId!),
    });
  }

  if (action === "connect_from_platform") {
    try {
      await connectRestaurantFromPlatformDiscovery(restaurantId!, {
        connectedByUserId: session?.user?.id,
      });
      await verifyRestaurantWhatsAppLink(restaurantId!).catch(() => null);
      return NextResponse.json({ ok: true, state: await fetchWizardState(restaurantId!) });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Connect failed" },
        { status: 400 }
      );
    }
  }

  if (action === "embedded_signup_complete") {
    const wabaId = String(body.wabaId || "").trim();
    const phoneNumberId = String(body.phoneNumberId || "").trim();
    if (!wabaId || !phoneNumberId) {
      return NextResponse.json({ error: "WABA ID و Phone Number ID مطلوبان" }, { status: 400 });
    }
    const result = await completeEmbeddedSignup(
      restaurantId!,
      {
        wabaId,
        phoneNumberId,
        metaBusinessId: body.metaBusinessId ? String(body.metaBusinessId) : undefined,
        displayPhoneNumber: body.displayPhoneNumber ? String(body.displayPhoneNumber) : undefined,
        businessName: body.businessName ? String(body.businessName) : undefined,
      },
      session?.user?.id
    );
    await prisma.whatsAppWizardSession.update({
      where: { restaurantId: restaurantId! },
      data: {
        step: 4,
        selectedWabaId: wabaId,
        selectedPhoneNumberId: phoneNumberId,
        selectedDisplayPhone: body.displayPhoneNumber ? String(body.displayPhoneNumber) : undefined,
      },
    });
    return NextResponse.json({
      ok: true,
      ...result,
      state: await fetchWizardState(restaurantId!),
    });
  }

  if (action === "sync_all") {
    await finalizeWizardConnection(restaurantId!, session?.user?.id).catch(() => null);
    const webhook = await verifyWizardWebhook(restaurantId!).catch(() => ({ ok: false }));
    const templates = await syncTemplatesFromMeta(restaurantId!).catch(() => []);
    await prisma.whatsAppWizardSession.update({
      where: { restaurantId: restaurantId! },
      data: { step: 7 },
    });
    return NextResponse.json({
      ok: true,
      webhookOk: webhook.ok,
      templateCount: templates.length,
      state: await fetchWizardState(restaurantId!),
    });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
