import { NextRequest, NextResponse } from "next/server";
import { requireWhatsAppInboxAccess } from "@/lib/marketing/auth";
import { getRestaurantConnection } from "@/lib/whatsapp-inbox/service";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { uploadWhatsAppMedia } from "@/lib/whatsapp-inbox/send";
import { logWhatsAppInboxAudit } from "@/lib/whatsapp-inbox/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId, session, canSend } = await requireWhatsAppInboxAccess();
  if (error) return error;
  if (!canSend) {
    return NextResponse.json({ error: "ليس لديك صلاحية الرفع" }, { status: 403 });
  }

  const connection = await getRestaurantConnection(restaurantId!);
  if (!connection?.phoneNumberId) {
    return NextResponse.json({ error: "WhatsApp غير متصل" }, { status: 400 });
  }

  const token = await resolveWhatsAppAccessToken();
  if (!token) {
    return NextResponse.json({ error: "WhatsApp Access Token is required" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "ملف مطلوب" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const filename = (form.get("filename") as string) || "upload";

  const uploaded = await uploadWhatsAppMedia({
    phoneNumberId: connection.phoneNumberId,
    accessToken: token,
    file,
    mimeType,
    filename,
  });

  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 400 });
  }

  await logWhatsAppInboxAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "INBOX_MEDIA_UPLOAD",
    details: { mimeType, filename },
  });

  let mediaType: "image" | "document" | "audio" | "video" = "document";
  if (mimeType.startsWith("image/")) mediaType = "image";
  else if (mimeType.startsWith("audio/")) mediaType = "audio";
  else if (mimeType.startsWith("video/")) mediaType = "video";

  return NextResponse.json({ mediaId: uploaded.mediaId, mediaType, mimeType });
}
