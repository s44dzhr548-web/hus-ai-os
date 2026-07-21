import { NextRequest, NextResponse } from "next/server";
import prisma, { withTimeout } from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { checkRateLimit, logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingCampaignGoal, MarketingPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

function serializeCampaign(c: Record<string, unknown>) {
  return {
    ...c,
    budget: c.budget != null ? Number(c.budget) : 0,
    spent: c.spent != null ? Number(c.spent) : 0,
  };
}

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "لم يتم تحديد المطعم — اختر مطعماً من القائمة." },
      { status: 400 }
    );
  }

  try {
    const campaigns = await withTimeout(
      prisma.marketingCampaign.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      12000
    );

    return NextResponse.json({ campaigns: campaigns.map(serializeCampaign) });
  } catch (e) {
    const timedOut = e instanceof Error && e.message === "DATABASE_TIMEOUT";
    return NextResponse.json(
      {
        error: timedOut
          ? "انتهت مهلة قاعدة البيانات — حاول مجدداً."
          : "تعذّر جلب الحملات — حاول مجدداً.",
      },
      { status: timedOut ? 504 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!checkRateLimit(restaurantId!, "campaigns")) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const campaign = await prisma.marketingCampaign.create({
    data: {
      restaurantId: restaurantId!,
      name: body.name || "حملة جديدة",
      goal: (body.goal as MarketingCampaignGoal) || "INCREASE_SALES",
      status: "DRAFT",
      platform: body.platform as MarketingPlatform | undefined,
      budget: body.budget ?? 0,
      scheduleStart: body.scheduleStart ? new Date(body.scheduleStart) : null,
      scheduleEnd: body.scheduleEnd ? new Date(body.scheduleEnd) : null,
      audienceJson: body.audience ?? undefined,
      locationsJson: body.locations ?? undefined,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      languages: body.languages ?? [],
      radiusKm: body.radiusKm,
      headline: body.headline,
      primaryText: body.primaryText,
      cta: body.cta,
      copyAr: body.copyAr,
      copyEn: body.copyEn,
      hashtags: body.hashtags ?? [],
      captions: body.captions,
      createdByUserId: session?.user?.id,
    },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "CAMPAIGN_CREATE",
    entityType: "MarketingCampaign",
    entityId: campaign.id,
  });

  return NextResponse.json(serializeCampaign(campaign as unknown as Record<string, unknown>), {
    status: 201,
  });
}
