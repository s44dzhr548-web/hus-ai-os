import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";
import { canManageProviderSecrets } from "@/lib/marketing/providers/permissions";
import { isR2Configured, uploadBufferToR2 } from "@/lib/storage/r2";
import { saveVideoBrandDefaults } from "@/lib/marketing/video-brand-service";
import { saveMediaAsset } from "@/lib/marketing/video-media-library";
import { VIDEO_MEDIA_CATEGORIES } from "@/lib/marketing/video-studio-types";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!isR2Configured()) {
    return marketingError("تخزين الوسائط غير مهيأ", 503);
  }

  const form = await req.formData();
  const file = form.get("file");
  const persist = form.get("persist") === "1";
  if (!(file instanceof File)) {
    return marketingError("ملف الشعار مطلوب", 400);
  }
  if (!ALLOWED.has(file.type)) {
    return marketingError("PNG أو JPG أو WEBP فقط", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (persist) {
    const row = await saveMediaAsset({
      restaurantId: restaurantId!,
      userId: session!.user.id,
      category: VIDEO_MEDIA_CATEGORIES.LOGO,
      buffer,
      mimeType: file.type,
      name: file.name,
      source: "device",
      isPrimary: true,
    });
    if (canManageProviderSecrets(session)) {
      await saveVideoBrandDefaults(restaurantId!, { logoUrl: row.url });
    }
    return NextResponse.json({ url: row.url, persisted: true });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `marketing/brand-logos/${restaurantId}/${randomUUID()}.${ext}`;
  const url = await uploadBufferToR2(buffer, key, file.type);
  return NextResponse.json({ url, persisted: false });
}
