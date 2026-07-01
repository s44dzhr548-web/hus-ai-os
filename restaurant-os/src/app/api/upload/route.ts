import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { uploadMedia, isR2Configured, PERMANENT_STORAGE_MESSAGE } from "@/lib/storage";
import { assertFeature, assertLimit } from "@/lib/permissions-engine";
import { isAllowedImageFile, MAX_IMAGE_BYTES, MAX_IMAGE_MB } from "@/lib/image-upload";
import {
  isAllowedVideoFile,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MB,
  normalizeVideoContentType,
  videoMimeForExtension,
} from "@/lib/video-upload";

export const dynamic = "force-dynamic";

/** Small-file fallback — large videos use presigned R2 upload from the browser. */
export async function POST(req: NextRequest) {
  try {
    const { restaurantId, error } = await requireRestaurant();
    if (error) return error;

    if (!isR2Configured()) {
      return NextResponse.json({ error: PERMANENT_STORAGE_MESSAGE }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";
    const isVideo = type === "video";

    if (!file) {
      return NextResponse.json({ error: "لم يتم رفع ملف" }, { status: 400 });
    }

    if (isVideo) {
      const videoCheck = await assertFeature(restaurantId!, "video");
      if (videoCheck) return videoCheck;

      if (!isAllowedVideoFile(file)) {
        return NextResponse.json(
          { error: "صيغة فيديو غير مدعومة (mp4, mov, webm)" },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `الحد الأقصى ${MAX_VIDEO_MB} ميجابايت` },
          { status: 400 }
        );
      }
    } else {
      if (!isAllowedImageFile(file)) {
        return NextResponse.json(
          { error: "صيغة صورة غير مدعومة (jpg, jpeg, png, webp)" },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: `الحد الأقصى ${MAX_IMAGE_MB} ميجابايت` }, { status: 400 });
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sizeMb = buffer.length / (1024 * 1024);

    const storageCheck = await assertLimit(restaurantId!, "storageMb", Math.ceil(sizeMb) || 1);
    if (storageCheck) return storageCheck;

    const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const filename = `${restaurantId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = isVideo
      ? normalizeVideoContentType(file.name, file.type)
      : file.type || "image/jpeg";

    const result = await uploadMedia(buffer, filename, contentType);

    return NextResponse.json({
      url: result.url,
      key: result.key,
      type: isVideo ? "video" : "image",
      storage: "r2",
    });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشل الرفع" },
      { status: 500 }
    );
  }
}
