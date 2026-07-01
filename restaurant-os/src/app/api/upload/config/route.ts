import { NextResponse } from "next/server";
import { storageStatus, PERMANENT_STORAGE_MESSAGE } from "@/lib/storage";
import { MAX_VIDEO_MB } from "@/lib/video-upload";
import { MAX_IMAGE_MB } from "@/lib/image-upload";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = storageStatus();
  const enabled = status.r2Configured;
  return NextResponse.json({
    permanentStorageEnabled: enabled,
    directUpload: enabled,
    storageProvider: status.provider,
    r2Configured: enabled,
    bucket: process.env.R2_BUCKET_NAME || "menuos-media",
    setupMessage: enabled ? null : PERMANENT_STORAGE_MESSAGE,
    missingEnvVars: enabled ? [] : status.missingEnvVars,
    maxVideoMb: MAX_VIDEO_MB,
    maxImageMb: MAX_IMAGE_MB,
    videoFormats: ["mp4", "mov", "webm"],
    imageFormats: ["jpg", "jpeg", "png", "webp"],
    movWarning: "يفضل رفع MP4 لضمان التشغيل على جميع الأجهزة",
  });
}
