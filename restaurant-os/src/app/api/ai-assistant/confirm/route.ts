import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { checkAiAssistantRateLimit } from "@/lib/ai-assistant/security";
import { confirmPendingAction } from "@/lib/ai-assistant/service";
import { AI_ASSISTANT_ROLES } from "@/lib/ai-assistant/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole([...AI_ASSISTANT_ROLES]);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const userId = session!.user.id;
  if (!checkAiAssistantRateLimit(restaurantId!, userId)) {
    return NextResponse.json({ error: "تجاوزت حد الطلبات" }, { status: 429 });
  }

  const body = await req.json();
  const pendingActionId = String(body.pendingActionId || "");
  const idempotencyKey = String(body.idempotencyKey || pendingActionId);
  const confirm = body.confirm !== false;

  if (!pendingActionId) {
    return NextResponse.json({ error: "معرف التأكيد مطلوب" }, { status: 400 });
  }

  const result = await confirmPendingAction({
    pendingActionId,
    restaurantId: restaurantId!,
    userId,
    userName: session!.user.name,
    userRole: session!.user.role || "RECEPTION",
    idempotencyKey,
    confirm,
  });

  await prisma.aiAssistantMessage.create({
    data: {
      restaurantId: restaurantId!,
      userId,
      role: "assistant",
      content: result.message,
      metadata: { confirmed: confirm, pendingActionId } as never,
    },
  });

  return NextResponse.json(result);
}
