import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { checkRateLimit, logMarketingAudit } from "@/lib/marketing/security";
import {
  answerMarketingAssistantQuestion,
  generateCampaignProposal,
  isCampaignCreationRequest,
  type MarketingCampaignProposal,
} from "@/lib/marketing/marketing-assistant-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const messages = await prisma.marketingChatMessage.findMany({
    where: { restaurantId: restaurantId! },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!restaurantId) {
    return NextResponse.json({ error: "لم يتم تحديد المطعم." }, { status: 400 });
  }
  if (!checkRateLimit(restaurantId, "chat")) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
  }

  await prisma.marketingChatMessage.create({
    data: {
      restaurantId,
      userId: session?.user?.id,
      role: "user",
      content: message,
    },
  });

  const campaignIntent = isCampaignCreationRequest(message);

  if (campaignIntent) {
    const generated = await generateCampaignProposal(restaurantId, message);
    if (!generated.ok) {
      await logMarketingAudit({
        restaurantId,
        userId: session?.user?.id,
        action: "AI_ASSISTANT_CAMPAIGN_FAIL",
        details: { error: generated.error.slice(0, 200) },
      });
      return NextResponse.json(
        { ok: false, source: "error", error: generated.error, type: "error" },
        { status: 502 }
      );
    }

    const { proposal, modelId } = generated;
    const assistantContent = proposal.summaryAr || `حملة: ${proposal.name}`;

    const assistantMsg = await prisma.marketingChatMessage.create({
      data: {
        restaurantId,
        role: "assistant",
        content: assistantContent,
      },
    });

    await logMarketingAudit({
      restaurantId,
      userId: session?.user?.id,
      action: "AI_ASSISTANT_CAMPAIGN",
      details: { modelId, campaignName: proposal.name },
    });

    return NextResponse.json({
      ok: true,
      source: "openai",
      type: "campaign_proposal",
      message: assistantMsg,
      proposal,
      modelId,
    });
  }

  const answered = await answerMarketingAssistantQuestion(restaurantId, message);
  if (!answered.ok) {
    return NextResponse.json(
      { ok: false, source: "error", error: answered.error, type: "error" },
      { status: 502 }
    );
  }

  const assistantMsg = await prisma.marketingChatMessage.create({
    data: {
      restaurantId,
      role: "assistant",
      content: answered.text,
    },
  });

  await logMarketingAudit({
    restaurantId,
    userId: session?.user?.id,
    action: "AI_CHAT",
    details: { questionLength: message.length },
  });

  return NextResponse.json({
    ok: true,
    source: "openai",
    type: "text",
    message: assistantMsg,
    content: answered.text,
  });
}
