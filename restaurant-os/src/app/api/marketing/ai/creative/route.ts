import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { generateCreativeBrief, generateVideoBrief } from "@/lib/marketing/ai-creative";
import { checkRateLimit, logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingCreativeType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!checkRateLimit(restaurantId!, "ai")) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const type = (body.type as MarketingCreativeType) || "FOOD_IMAGE";
  const isVideo = String(type).startsWith("VIDEO_");

  const brief = isVideo
    ? await generateVideoBrief({
        restaurantId: restaurantId!,
        type,
        durationSec: body.durationSec || 30,
        prompt: body.prompt,
      })
    : await generateCreativeBrief({
        restaurantId: restaurantId!,
        type,
        prompt: body.prompt,
        season: body.season,
      });

  const creative = await prisma.marketingCreative.create({
    data: {
      restaurantId: restaurantId!,
      campaignId: body.campaignId ?? null,
      type,
      title: brief.title,
      prompt: brief.prompt,
      metadataJson: brief.metadata ?? undefined,
      season: body.season,
      durationSec: isVideo ? (brief as { durationSec?: number }).durationSec : null,
      voiceOver: isVideo ? (brief as { voiceOver?: string }).voiceOver : null,
      subtitles: isVideo ? (brief as { subtitles?: string }).subtitles : null,
    },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: isVideo ? "AI_VIDEO_GENERATE" : "AI_CREATIVE_GENERATE",
    entityId: creative.id,
  });

  return NextResponse.json({ creative, brief });
}
