import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { listAiAssistantActionLogs } from "@/lib/ai-assistant/audit";
import { AI_ASSISTANT_ROLES } from "@/lib/ai-assistant/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole([...AI_ASSISTANT_ROLES]);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const [messages, actionLogs] = await Promise.all([
    prisma.aiAssistantMessage.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    }),
    listAiAssistantActionLogs(restaurantId!, 30),
  ]);

  return NextResponse.json({
    messages: messages.reverse(),
    actionLogs,
  });
}
