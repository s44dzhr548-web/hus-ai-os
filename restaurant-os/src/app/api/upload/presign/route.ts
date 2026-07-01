import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { isR2Configured, PERMANENT_STORAGE_MESSAGE } from "@/lib/storage";
import { assertFeature } from "@/lib/permissions-engine";
import {
  buildR2KeyFromFile,
  createPresignedUploadUrl,
  publicUrlForKey,
} from "@/lib/storage/r2";
import { isAllowedImageFile, MAX_IMAGE_BYTES, MAX_IMAGE_MB } from "@/lib/image-upload";
import {
  isAllowedVideoFile,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MB,
  normalizeVideoContentType,
} from "@/lib/video-upload";
import type { MediaKind } from "@/lib/media-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: PERMANENT_STORAGE_MESSAGE }, { status: 503 });
  }

  try {
    const body = await req.json();
    const mediaType = (body.mediaType as MediaKind) || "image";
    const fileName = String(body.fileName || "upload.bin");
    const fileSize = Number(body.fileSize || 0);
    const fileType = String(body.fileType || "");

    const auth = await requireRestaurant(body.restaurantId as string | undefined);
    if (auth.error) return auth.error;

    if (mediaType === "video") {
      const videoCheck = await assertFeature(auth.restaurantId!, "video");
      if (videoCheck) return videoCheck;
    }

    const pseudoFile = {
      name: fileName,
      type: fileType,
      size: fileSize,
    } as File;

    if (mediaType === "video") {
      if (!isAllowedVideoFile(pseudoFile)) {
        return NextResponse.json(
          { error: "صيغة فيديو غير مدعومة (mp4, mov, webm)" },
          { status: 400 }
        );
      }
      if (fileSize > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `الحد الأقصى ${MAX_VIDEO_MB} ميجابايت` },
          { status: 400 }
        );
      }
    } else {
      if (!isAllowedImageFile(pseudoFile)) {
        return NextResponse.json(
          { error: "صيغة صورة غير مدعومة (jpg, jpeg, png, webp)" },
          { status: 400 }
        );
      }
      if (fileSize > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `الحد الأقصى ${MAX_IMAGE_MB} ميجابايت` },
          { status: 400 }
        );
      }
    }

    const contentType =
      mediaType === "video"
        ? normalizeVideoContentType(fileName, fileType)
        : fileType || "image/jpeg";

    const key = buildR2KeyFromFile(pseudoFile, mediaType, auth.restaurantId!);
    const uploadUrl = await createPresignedUploadUrl(key, contentType);
    const publicUrl = publicUrlForKey(key);

    return NextResponse.json({ uploadUrl, publicUrl, key, contentType });
  } catch (err) {
    console.error("[upload/presign]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشل تجهيز الرفع" },
      { status: 500 }
    );
  }
}
