import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";
import {
  listMediaLibrary,
  saveMediaAsset,
  fetchExternalToBuffer,
  normalizeExternalMediaUrl,
} from "@/lib/marketing/video-media-library";
import { toPublicAsset } from "@/lib/marketing/video-project-service";
import {
  MAX_REFERENCE_IMAGES,
  MAX_VIDEO_BYTES,
  VIDEO_MEDIA_CATEGORIES,
  type MediaSource,
  type VideoMediaCategory,
} from "@/lib/marketing/video-studio-types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const rows = await listMediaLibrary(restaurantId!, category);
  return NextResponse.json({ assets: rows.map(toPublicAsset) });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: { url?: string; category?: string; name?: string; source?: MediaSource; isPrimary?: boolean };
    try {
      body = await req.json();
    } catch {
      return marketingError("طلب غير صالح", 400);
    }
    const url = typeof body.url === "string" ? normalizeExternalMediaUrl(body.url) : "";
    if (!url) return marketingError("الرابط مطلوب", 400);
    const category = (body.category ?? VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE) as VideoMediaCategory;
    try {
      const max = category === VIDEO_MEDIA_CATEGORIES.REFERENCE_VIDEO ? MAX_VIDEO_BYTES : 25 * 1024 * 1024;
      const { buffer, mimeType } = await fetchExternalToBuffer(url, max);
      const row = await saveMediaAsset({
        restaurantId: restaurantId!,
        userId: session!.user.id,
        category,
        buffer,
        mimeType,
        name: body.name,
        source: body.source ?? "url",
        isPrimary: body.isPrimary,
      });
      return NextResponse.json({ asset: toPublicAsset(row) });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل الاستيراد" },
        { status: 400 }
      );
    }
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return marketingError("الملف مطلوب", 400);

  const category = String(form.get("category") ?? VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE) as VideoMediaCategory;
  const source = String(form.get("source") ?? "device") as MediaSource;
  const isPrimary = form.get("isPrimary") === "true";
  const name = form.get("name") ? String(form.get("name")) : file.name;

  if (category === VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE) {
    const count = await listMediaLibrary(restaurantId!, VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE);
    if (count.length >= MAX_REFERENCE_IMAGES) {
      return marketingError(`الحد الأقصى ${MAX_REFERENCE_IMAGES} صورة مرجعية`, 400);
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const row = await saveMediaAsset({
      restaurantId: restaurantId!,
      userId: session!.user.id,
      category,
      buffer,
      mimeType: file.type || "application/octet-stream",
      name,
      source,
      isPrimary,
    });
    return NextResponse.json({ asset: toPublicAsset(row) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الرفع" },
      { status: 400 }
    );
  }
}
