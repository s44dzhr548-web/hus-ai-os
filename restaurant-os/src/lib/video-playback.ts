import { isLegacyMediaUrl } from "@/lib/storage/constants";

export type VideoPlaybackError =
  | "missing"
  | "not_public"
  | "unsupported"
  | "storage"
  | "network";

export interface ProductVideoFields {
  mediaType?: string | null;
  videoUrl?: string | null;
  previewUrl?: string | null;
  imageUrl?: string | null;
}

export function isVideoMedia(item: ProductVideoFields): boolean {
  if (item.mediaType === "VIDEO") return !!(item.videoUrl || item.previewUrl);
  if (item.mediaType === "IMAGE") return false;
  return !!(item.videoUrl || item.previewUrl);
}

/** Prefer permanent videoUrl; previewUrl is fallback poster/thumbnail source only. */
export function resolveVideoSrc(item: ProductVideoFields): string {
  if (!isVideoMedia(item)) return "";
  return (item.videoUrl || item.previewUrl || "").trim();
}

export function resolveVideoPoster(item: ProductVideoFields): string | undefined {
  if (item.imageUrl && item.mediaType !== "VIDEO") return item.imageUrl;
  if (item.imageUrl) return item.imageUrl;
  return undefined;
}

export function videoErrorMessage(
  code: VideoPlaybackError,
  locale: "ar" | "en" = "ar"
): string {
  const ar: Record<VideoPlaybackError, string> = {
    missing: "رابط الفيديو غير موجود — أعد رفع الفيديو من لوحة المنيو",
    not_public: "الفيديو غير متاح للعامة (404) — أعد رفع الفيديو من لوحة المنيو",
    unsupported: "صيغة الفيديو غير مدعومة — استخدم MP4 (H.264) أو MOV",
    storage: "التخزين الدائم غير مفعل — أعد رفع الفيديو من لوحة المنيو",
    network: "تعذر تحميل الفيديو — تحقق من الاتصال",
  };
  const en: Record<VideoPlaybackError, string> = {
    missing: "Video URL is missing — re-upload from owner dashboard",
    not_public: "Video is not publicly accessible (404) — check permanent storage",
    unsupported: "Unsupported video format — use MP4 (H.264) or MOV",
    storage: "Storage error — enable Vercel Blob or R2 for videos",
    network: "Could not load video — check connection",
  };
  return (locale === "ar" ? ar : en)[code];
}

export function mapMediaErrorToPlaybackError(
  httpStatus?: number,
  mediaErrorCode?: number
): VideoPlaybackError {
  if (httpStatus === 404) return "not_public";
  if (httpStatus && httpStatus >= 500) return "storage";
  if (mediaErrorCode === 4 || mediaErrorCode === 3) return "unsupported";
  if (mediaErrorCode === 2) return "network";
  return "storage";
}

/** Server-side URL probe only — do not call from the browser (R2 CORS blocks cross-origin HEAD). */
export async function probeVideoUrl(url: string): Promise<{
  ok: boolean;
  status?: number;
  contentType?: string;
  error?: VideoPlaybackError;
}> {
  if (!url) return { ok: false, error: "missing" };
  if (isLegacyMediaUrl(url)) {
    return { ok: false, status: 410, error: "storage" };
  }
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (res.status === 404) return { ok: false, status: 404, error: "not_public" };
    if (!res.ok) return { ok: false, status: res.status, error: "storage" };
    const contentType = res.headers.get("content-type") || undefined;
    return { ok: true, status: res.status, contentType };
  } catch {
    return { ok: false, error: "network" };
  }
}

export function detectVideoMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  const box = buffer.subarray(4, 8).toString("ascii");
  if (box === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("qt") || brand === "moov") return "video/quicktime";
    return "video/mp4";
  }
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf) {
    return "video/webm";
  }
  return null;
}
