import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingCampaignStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id, restaurantId: restaurantId!, deletedAt: null },
    include: { creatives: true, metrics: { take: 10, orderBy: { capturedAt: "desc" } } },
  });

  if (!campaign) {
    return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  }

  return NextResponse.json({
    ...campaign,
    budget: Number(campaign.budget ?? 0),
    spent: Number(campaign.spent ?? 0),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;

  const existing = await prisma.marketingCampaign.findFirst({
    where: { id, restaurantId: restaurantId!, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action as string | undefined;

  if (action === "pause") {
    body.status = "PAUSED";
  } else if (action === "resume") {
    body.status = "ACTIVE";
  } else if (action === "archive") {
    body.status = "ARCHIVED";
    body.archivedAt = new Date();
  } else if (action === "duplicate") {
    const dup = await prisma.marketingCampaign.create({
      data: {
        restaurantId: restaurantId!,
        name: `${existing.name} (نسخة)`,
        goal: existing.goal,
        status: "DRAFT",
        platform: existing.platform,
        budget: existing.budget,
        headline: existing.headline,
        primaryText: existing.primaryText,
        cta: existing.cta,
        copyAr: existing.copyAr,
        copyEn: existing.copyEn,
        hashtags: existing.hashtags,
        captions: existing.captions,
        audienceJson: existing.audienceJson ?? undefined,
        locationsJson: existing.locationsJson ?? undefined,
        ageMin: existing.ageMin,
        ageMax: existing.ageMax,
        languages: existing.languages,
        radiusKm: existing.radiusKm,
        createdByUserId: session?.user?.id,
      },
    });
    await logMarketingAudit({
      restaurantId: restaurantId!,
      userId: session?.user?.id,
      action: "CAMPAIGN_DUPLICATE",
      entityId: dup.id,
    });
    return NextResponse.json({ ...dup, budget: Number(dup.budget ?? 0) });
  }

  const data: Record<string, unknown> = {};
  const fields = [
    "name", "goal", "status", "platform", "budget", "spent",
    "scheduleStart", "scheduleEnd", "audienceJson", "locationsJson",
    "ageMin", "ageMax", "languages", "radiusKm",
    "headline", "primaryText", "cta", "copyAr", "copyEn", "hashtags", "captions",
  ] as const;

  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.status === "ACTIVE" && !existing.scheduleStart) {
    data.scheduleStart = new Date();
  }

  const updated = await prisma.marketingCampaign.update({
    where: { id },
    data: data as { status?: MarketingCampaignStatus },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: action ? `CAMPAIGN_${action.toUpperCase()}` : "CAMPAIGN_UPDATE",
    entityId: id,
  });

  return NextResponse.json({ ...updated, budget: Number(updated.budget ?? 0) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;

  await prisma.marketingCampaign.updateMany({
    where: { id, restaurantId: restaurantId! },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "CAMPAIGN_DELETE",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
