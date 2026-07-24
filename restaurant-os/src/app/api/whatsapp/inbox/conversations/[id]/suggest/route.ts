import { NextRequest, NextResponse } from "next/server";
import { requireWhatsAppInboxAccess } from "@/lib/marketing/auth";
import { suggestInboxReply } from "@/lib/whatsapp-inbox/ai-suggest";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { error, restaurantId, canSend } = await requireWhatsAppInboxAccess();
  if (error) return error;
  if (!canSend) {
    return NextResponse.json({ error: "ليس لديك صلاحية" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const result = await suggestInboxReply({ restaurantId: restaurantId!, conversationId: id });
  return NextResponse.json(result);
}
