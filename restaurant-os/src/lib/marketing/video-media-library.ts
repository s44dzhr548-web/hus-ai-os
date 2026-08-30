import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { uploadBufferToR2, isR2Configured } from "@/lib/storage/r2";
import {
  MAX_VIDEO_BYTES,
  VIDEO_MEDIA_CATEGORIES,
  type MediaSource,
  type VideoMediaCategory,
} from "@/lib/marketing/video-studio-types";

export function normalizeExternalMediaUrl(input: string): string {
  const url = input.trim();
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  if (url.includes("dropbox.com")) {
    return url.replace(/dl=0/, "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }
  return url;
}

export async function fetchExternalToBuffer(url: string, maxBytes: number): Promise<{ buffer: Buffer; mimeType: string }> {
  const resolved = normalizeExternalMediaUrl(url);
  const res = await fetch(resolved, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`تعذر جلب الرابط: HTTP ${res.status}`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Error("حجم الملف يتجاوز الحد المسموح");
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > maxBytes) throw new Error("حجم الملف يتجاوز الحد المسموح");
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  return { buffer, mimeType };
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("mp4")) return "mp4";
  return "jpg";
}

export async function saveMediaAsset(params: {
  restaurantId: string;
  userId: string;
  category: VideoMediaCategory;
  buffer: Buffer;
  mimeType: string;
  name?: string;
  source: MediaSource;
  isPrimary?: boolean;
}) {
  if (!isR2Configured()) throw new Error("تخزين الوسائط غير مهيأ (R2)");
  const isVideo = params.mimeType.startsWith("video/");
  if (isVideo && params.buffer.length > MAX_VIDEO_BYTES) {
    throw new Error("الحد الأقصى للفيديو المرجعي 200MB");
  }

  const ext = extFromMime(params.mimeType);
  const key = `marketing/video-media/${params.restaurantId}/${randomUUID()}.${ext}`;
  const url = await uploadBufferToR2(params.buffer, key, params.mimeType);

  if (params.isPrimary && params.category === VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE) {
    await prisma.marketingVideoMediaAsset.updateMany({
      where: { restaurantId: params.restaurantId, category: params.category },
      data: { isPrimary: false },
    });
  }

  if (params.category === VIDEO_MEDIA_CATEGORIES.LOGO) {
    await prisma.marketingVideoBrandSettings.upsert({
      where: { restaurantId: params.restaurantId },
      create: { restaurantId: params.restaurantId, logoUrl: url },
      update: { logoUrl: url },
    });
  }

  return prisma.marketingVideoMediaAsset.create({
    data: {
      restaurantId: params.restaurantId,
      category: params.category,
      name: params.name ?? null,
      url,
      r2Key: key,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
      thumbnailUrl: isVideo ? null : url,
      source: params.source,
      isPrimary: Boolean(params.isPrimary),
      createdBy: params.userId,
    },
  });
}

export async function listMediaLibrary(restaurantId: string, category?: string) {
  return prisma.marketingVideoMediaAsset.findMany({
    where: { restaurantId, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { isPrimary: "desc" }, { createdAt: "desc" }],
  });
}

export async function deleteMediaAsset(restaurantId: string, assetId: string) {
  const row = await prisma.marketingVideoMediaAsset.findFirst({
    where: { id: assetId, restaurantId },
  });
  if (!row) throw new Error("الملف غير موجود");
  if (row.category === VIDEO_MEDIA_CATEGORIES.LOGO) {
    throw new Error("لا يمكن حذف شعار المطعم من هنا — استخدم إعدادات المطعم");
  }
  await prisma.marketingVideoMediaAsset.delete({ where: { id: assetId } });
}

export async function setPrimaryAsset(restaurantId: string, assetId: string) {
  const row = await prisma.marketingVideoMediaAsset.findFirst({
    where: { id: assetId, restaurantId },
  });
  if (!row) throw new Error("الملف غير موجود");
  await prisma.marketingVideoMediaAsset.updateMany({
    where: { restaurantId, category: row.category },
    data: { isPrimary: false },
  });
  await prisma.marketingVideoMediaAsset.update({
    where: { id: assetId },
    data: { isPrimary: true },
  });
}

export async function getAssetsByIds(restaurantId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.marketingVideoMediaAsset.findMany({
    where: { restaurantId, id: { in: ids } },
  });
}

export async function assetUrlAsDataUriIfImage(url: string, mimeType: string): Promise<string | undefined> {
  if (!mimeType.startsWith("image/")) return undefined;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) return undefined;
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}
