import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { answerMarketingQuestion } from "@/lib/marketing/ai-assistant";
import { checkRateLimit, logMarketingAudit } from "@/lib/marketing/security";

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
  if (!checkRateLimit(restaurantId!, "chat")) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const question = String(body.message || "").trim();
  if (!question) {
    return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
  }

  await prisma.marketingChatMessage.create({
    data: {
      restaurantId: restaurantId!,
      userId: session?.user?.id,
      role: "user",
      content: question,
    },
  });

  const answer = await answerMarketingQuestion(restaurantId!, question);

  const assistantMsg = await prisma.marketingChatMessage.create({
    data: {
      restaurantId: restaurantId!,
      role: "assistant",
      content: answer,
    },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "AI_CHAT",
    details: { questionLength: question.length },
  });

  return NextResponse.json({ message: assistantMsg });
}
