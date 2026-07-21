import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { generateCampaignCopy } from "@/lib/marketing/ai-campaign";
import { checkRateLimit, logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingCampaignGoal } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!checkRateLimit(restaurantId!, "ai")) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const copy = await generateCampaignCopy({
    restaurantId: restaurantId!,
    goal: (body.goal as MarketingCampaignGoal) || "INCREASE_SALES",
    context: body.context,
  });

  if ("error" in copy) {
    return NextResponse.json({ error: copy.error }, { status: 400 });
  }

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "AI_CAMPAIGN_GENERATE",
    details: { goal: body.goal },
  });

  return NextResponse.json(copy);
}
