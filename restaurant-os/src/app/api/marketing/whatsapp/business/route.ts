import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireWhatsAppBusinessReadAccess,
  requireWhatsAppBusinessOwnerAccess,
} from "@/lib/marketing/auth";
import {
  fetchWhatsAppHubData,
  syncTemplatesFromMeta,
  testWhatsAppConnection,
  disconnectWhatsAppBusiness,
  getOrCreateAutomation,
  automationFromRow,
  sendTestWhatsAppMessage,
} from "@/lib/marketing/whatsapp-business";
import { saveRestaurantWhatsAppConnection, connectRestaurantFromPlatformDiscovery, verifyRestaurantWhatsAppLink, refreshRestaurantWhatsAppConnection } from "@/lib/marketing/whatsapp-connection-service";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId, canEdit, session } = await requireWhatsAppBusinessReadAccess();
  if (error) return error;

  const data = await fetchWhatsAppHubData(restaurantId!);

  return NextResponse.json({
    ...data,
    permissions: {
      canEdit,
      role: session?.user?.role ?? null,
      readOnly: !canEdit,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { error, restaurantId } = await requireWhatsAppBusinessOwnerAccess();
  if (error) return error;

  const body = await req.json();
  await getOrCreateAutomation(restaurantId!);

  const data: Record<string, unknown> = {};
  if (body.isEnabled !== undefined) data.isEnabled = Boolean(body.isEnabled);
  if (body.delayMinutes !== undefined) data.delayMinutes = Number(body.delayMinutes);
  if (body.templateName !== undefined) data.templateName = String(body.templateName);
  if (body.messageBody !== undefined) data.messageBody = body.messageBody || null;
  if (body.reviewLinkBase !== undefined) data.reviewLinkBase = body.reviewLinkBase || null;
  if (body.branchId !== undefined) data.branchId = body.branchId || null;
  if (body.testPhone !== undefined) data.testPhone = body.testPhone || null;

  const automation = await prisma.afterVisitWhatsAppAutomation.update({
    where: { restaurantId: restaurantId! },
    data,
  });

  return NextResponse.json({ automation: automationFromRow(automation) });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireWhatsAppBusinessOwnerAccess();
  if (error) return error;

  const body = await req.json();
  const action = body.action as string;

  if (action === "discover_platform") {
    await connectRestaurantFromPlatformDiscovery(restaurantId!, {
      connectedByUserId: session?.user?.id,
    });
    await verifyRestaurantWhatsAppLink(restaurantId!).catch(() => null);
    return NextResponse.json({ success: true });
  }

  if (action === "save_connection") {
    const phoneNumberId = String(body.phoneNumberId || "").trim();
    const wabaId = String(body.wabaId || "").trim();
    if (!phoneNumberId || !wabaId) {
      return NextResponse.json({ error: "WABA ID و Phone Number ID مطلوبان" }, { status: 400 });
    }

    const platformToken = await resolveWhatsAppAccessToken();
    if (!platformToken) {
      return NextResponse.json(
        { error: "WhatsApp Access Token غير مضبوط على مستوى المنصة" },
        { status: 503 }
      );
    }

    const creds = await resolveMetaCredentials();
    await prisma.whatsAppBusinessConnection.upsert({
      where: { restaurantId: restaurantId! },
      create: {
        restaurantId: restaurantId!,
        metaBusinessId: String(body.metaBusinessId || creds.metaBusinessId || ""),
        wabaId,
        phoneNumberId,
        businessPhone: String(body.businessPhone || body.displayPhoneNumber || ""),
        accessTokenEnc: null,
        connectionStatus: "NOT_CONNECTED",
        isActive: true,
      },
      update: {
        metaBusinessId: String(body.metaBusinessId || creds.metaBusinessId || ""),
        wabaId,
        phoneNumberId,
        isActive: true,
      },
    });

    const refresh = await refreshRestaurantWhatsAppConnection(restaurantId!);
    if (!refresh.ok) {
      return NextResponse.json({ error: refresh.error || "Graph API verification failed" }, { status: 400 });
    }

    const connection = await prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: restaurantId! },
    });

    return NextResponse.json({
      connection: {
        id: connection!.id,
        phoneNumberId: connection!.phoneNumberId,
        wabaId: connection!.wabaId,
        businessPhone: connection!.businessPhone,
        connectionStatus: connection!.connectionStatus,
        isActive: connection!.isActive,
        connected: connection!.connectionStatus === "CONNECTED",
      },
    });
  }

  if (action === "test_connection") {
    const result = await testWhatsAppConnection(restaurantId!);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "disconnect") {
    await disconnectWhatsAppBusiness(restaurantId!);
    return NextResponse.json({ success: true, connected: false });
  }

  if (action === "sync_templates") {
    try {
      const templates = await syncTemplatesFromMeta(restaurantId!);
      return NextResponse.json({ templates, syncedAt: new Date().toISOString() });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل مزامنة القوالب" },
        { status: 400 }
      );
    }
  }

  if (action === "test_send") {
    const testPhone = String(body.testPhone || "").trim();
    if (!testPhone) {
      return NextResponse.json({ error: "رقم الاختبار مطلوب" }, { status: 400 });
    }
    try {
      const result = await sendTestWhatsAppMessage({
        restaurantId: restaurantId!,
        testPhone,
        customerName: body.customerName,
        tableNumber: body.tableNumber,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, retryable: result.retryable }, { status: 400 });
      }
      return NextResponse.json({ success: true, messageId: result.messageId });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل الإرسال" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
