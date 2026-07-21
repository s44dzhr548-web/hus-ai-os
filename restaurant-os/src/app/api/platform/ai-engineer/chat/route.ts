import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { processEngineerChatCommand } from "@/lib/ai-engineer/chat-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
  }

  const result = await processEngineerChatCommand({
    message,
    actorId: session!.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
