import { NextRequest, NextResponse } from "next/server";
import { requireWhatsAppInboxAccess } from "@/lib/marketing/auth";
import { addInternalNote, sendInboxMessage } from "@/lib/whatsapp-inbox/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { error, restaurantId, session, canSend } = await requireWhatsAppInboxAccess();
  if (error) return error;
  if (!canSend) {
    return NextResponse.json({ error: "ليس لديك صلاحية الإرسال" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const action = String(body.action || "send");

  if (action === "note") {
    const note = await addInternalNote({
      restaurantId: restaurantId!,
      conversationId: id,
      authorUserId: session?.user?.id,
      body: String(body.body || ""),
    });
    return NextResponse.json({ note });
  }

  if (action === "send") {
    const kind = String(body.kind || "text") as "text" | "template" | "media";
    const msg = await sendInboxMessage({
      restaurantId: restaurantId!,
      conversationId: id,
      userId: session?.user?.id,
      kind,
      text: body.text ? String(body.text) : undefined,
      templateName: body.templateName ? String(body.templateName) : undefined,
      templateLanguage: body.templateLanguage ? String(body.templateLanguage) : undefined,
      templateBodyParams: Array.isArray(body.templateBodyParams) ?
        body.templateBodyParams.map(String)
      : undefined,
      mediaId: body.mediaId ? String(body.mediaId) : undefined,
      mediaType: body.mediaType as "image" | "document" | "audio" | "video" | undefined,
      mediaCaption: body.mediaCaption ? String(body.mediaCaption) : undefined,
      mediaFilename: body.mediaFilename ? String(body.mediaFilename) : undefined,
    });
    return NextResponse.json({ message: msg });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
