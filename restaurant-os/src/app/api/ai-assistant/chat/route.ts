import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { checkAiAssistantRateLimit } from "@/lib/ai-assistant/security";
import { processAssistantMessage } from "@/lib/ai-assistant/service";
import { AI_ASSISTANT_ROLES } from "@/lib/ai-assistant/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole([...AI_ASSISTANT_ROLES]);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const userId = session!.user.id;
  if (!checkAiAssistantRateLimit(restaurantId!, userId)) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات — انتظر دقيقة" }, { status: 429 });
  }

  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "الرسالة مطلوبة (2000 حرف كحد أقصى)" }, { status: 400 });
  }

  await prisma.aiAssistantMessage.create({
    data: {
      restaurantId: restaurantId!,
      userId,
      role: "user",
      content: message,
    },
  });

  const result = await processAssistantMessage({
    restaurantId: restaurantId!,
    userId,
    userName: session!.user.name,
    userRole: session!.user.role || "RECEPTION",
    message,
  });

  const assistantMsg = await prisma.aiAssistantMessage.create({
    data: {
      restaurantId: restaurantId!,
      userId,
      role: "assistant",
      content: result.message,
      metadata: {
        toolResults: result.toolResults,
        pendingAction: result.pendingAction,
      } as never,
    },
  });

  return NextResponse.json({
    assistantMessage: assistantMsg,
    reply: result.message,
    toolResults: result.toolResults,
    pendingAction: result.pendingAction,
  });
}
