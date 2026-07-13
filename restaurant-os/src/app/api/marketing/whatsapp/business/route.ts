import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireWhatsAppBusinessReadAccess,
  requireWhatsAppBusinessOwnerAccess,
} from "@/lib/marketing/auth";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import {
  fetchWhatsAppHubData,
  syncTemplatesFromMeta,
  testWhatsAppConnection,
  disconnectWhatsAppBusiness,
  getOrCreateAutomation,
  automationFromRow,
  sendTestWhatsAppMessage,
  DEFAULT_AUTOMATION,
} from "@/lib/marketing/whatsapp-business";

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

  if (action === "save_connection") {
    if (!canEncryptTokens()) {
      return NextResponse.json(
        { error: "MARKETING_TOKEN_SECRET غير مضبوط للتشفير" },
        { status: 503 }
      );
    }
    const phoneNumberId = String(body.phoneNumberId || "").trim();
    const accessToken = String(body.accessToken || "").trim();
    if (!phoneNumberId) {
      return NextResponse.json({ error: "Phone Number ID مطلوب" }, { status: 400 });
    }

    const existing = await prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: restaurantId! },
    });

    if (!accessToken && !existing?.accessTokenEnc) {
      return NextResponse.json({ error: "Access Token مطلوب" }, { status: 400 });
    }

    const tokenEnc = accessToken ? encryptToken(accessToken) : existing!.accessTokenEnc;

    const connection = await prisma.whatsAppBusinessConnection.upsert({
      where: { restaurantId: restaurantId! },
      create: {
        restaurantId: restaurantId!,
        phoneNumberId,
        wabaId: body.wabaId || null,
        businessPhone: body.businessPhone || null,
        accessTokenEnc: tokenEnc,
        templateName: body.templateName || DEFAULT_AUTOMATION.templateName,
        templateLanguage: body.templateLanguage || "ar",
        isActive: true,
        connectedByUserId: session?.user?.id,
      },
      update: {
        phoneNumberId,
        wabaId: body.wabaId || null,
        businessPhone: body.businessPhone || null,
        accessTokenEnc: tokenEnc,
        templateName: body.templateName || undefined,
        templateLanguage: body.templateLanguage || undefined,
        isActive: true,
      },
    });

    return NextResponse.json({
      connection: {
        id: connection.id,
        phoneNumberId: connection.phoneNumberId,
        isActive: connection.isActive,
        connected: true,
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
