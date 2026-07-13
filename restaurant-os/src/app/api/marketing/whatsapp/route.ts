import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getSegmentCustomers } from "@/lib/marketing/segments";
import { logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingSegment, MarketingWhatsAppType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const campaigns = await prisma.marketingWhatsAppCampaign.findMany({
    where: { restaurantId: restaurantId! },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;

  const body = await req.json();
  const segment = body.segment as MarketingSegment | undefined;

  let recipientCount = 0;
  if (segment) {
    const customers = await getSegmentCustomers(restaurantId!, segment, 1000);
    recipientCount = customers.filter((c) => c.marketingConsent && c.customerPhone).length;
  } else {
    recipientCount = await prisma.customerProfile.count({
      where: { restaurantId: restaurantId!, marketingConsent: true, customerPhone: { not: null } },
    });
  }

  if (recipientCount === 0 && body.status === "SEND") {
    return NextResponse.json(
      { error: "لا يوجد عملاء بموافقة تسويقية ورقم هاتف" },
      { status: 400 }
    );
  }

  const campaign = await prisma.marketingWhatsAppCampaign.create({
    data: {
      restaurantId: restaurantId!,
      type: (body.type as MarketingWhatsAppType) || "OFFER",
      title: body.title || "حملة واتساب",
      message: body.message || "",
      segment: segment ?? null,
      recipientCount,
      status: body.status === "SEND" ? "SENT" : "DRAFT",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      sentAt: body.status === "SEND" ? new Date() : null,
      sentCount: body.status === "SEND" ? recipientCount : 0,
      createdByUserId: session?.user?.id,
    },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "WHATSAPP_CAMPAIGN_CREATE",
    entityId: campaign.id,
    details: { recipientCount, consentOnly: true },
  });

  return NextResponse.json({ campaign, note: "يتم الإرسال عبر wa.me — لا يتم تخزين كلمات المرور" });
}
