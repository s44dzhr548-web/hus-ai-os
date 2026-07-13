import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import {
  getOrCreateAutomation,
  automationFromRow,
  sendTestWhatsAppMessage,
  processWhatsAppQueue,
} from "@/lib/after-visit-whatsapp/service";
import { DEFAULT_AUTOMATION, DEFAULT_MESSAGE_BODY, DELAY_OPTIONS } from "@/lib/after-visit-whatsapp/types";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  void processWhatsAppQueue(20).catch(console.error);

  const [automation, connection, deliveries, branches, restaurant] = await Promise.all([
    getOrCreateAutomation(restaurantId!),
    prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: restaurantId! },
    }),
    prisma.whatsAppMessageDelivery.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        visit: { select: { customerName: true, tableDisplayNumber: true } },
      },
    }),
    prisma.branch.findMany({
      where: { restaurantId: restaurantId!, isActive: true },
      select: { id: true, name: true, nameAr: true },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId! },
      select: { slug: true, name: true, nameAr: true },
    }),
  ]);

  const baseUrl = resolveAppBaseUrl();
  const reviewLinkExample =
    automation.reviewLinkBase ||
    (restaurant ? `${baseUrl}/r/${restaurant.slug}/rate` : baseUrl);

  return NextResponse.json({
    automation: automationFromRow(automation),
    connection: connection
      ? {
          id: connection.id,
          phoneNumberId: connection.phoneNumberId,
          wabaId: connection.wabaId,
          businessPhone: connection.businessPhone,
          templateName: connection.templateName,
          templateLanguage: connection.templateLanguage,
          isActive: connection.isActive,
          connectedAt: connection.connectedAt,
          hasToken: Boolean(connection.accessTokenEnc),
        }
      : null,
    deliveries,
    branches: branches.map((b) => ({ id: b.id, name: b.nameAr || b.name })),
    delayOptions: DELAY_OPTIONS,
    defaultMessageBody: DEFAULT_MESSAGE_BODY,
    reviewLinkExample,
    encryptionReady: canEncryptTokens(),
  });
}

export async function PATCH(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
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
  const { error, restaurantId, session } = await requireMarketingAccess();
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
      return NextResponse.json({ error: "phoneNumberId مطلوب" }, { status: 400 });
    }

    const existing = await prisma.whatsAppBusinessConnection.findUnique({
      where: { restaurantId: restaurantId! },
    });

    if (!accessToken && !existing?.accessTokenEnc) {
      return NextResponse.json({ error: "accessToken مطلوب" }, { status: 400 });
    }

    const tokenEnc =
      accessToken ? encryptToken(accessToken) : existing!.accessTokenEnc;

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
        isActive: body.isActive !== false,
        connectedByUserId: session?.user?.id,
      },
      update: {
        phoneNumberId,
        wabaId: body.wabaId || null,
        businessPhone: body.businessPhone || null,
        accessTokenEnc: tokenEnc,
        templateName: body.templateName || undefined,
        templateLanguage: body.templateLanguage || undefined,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({
      connection: {
        id: connection.id,
        phoneNumberId: connection.phoneNumberId,
        isActive: connection.isActive,
        templateName: connection.templateName,
      },
    });
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
