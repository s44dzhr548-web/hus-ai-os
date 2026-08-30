export const VIDEO_MEDIA_CATEGORIES = {
  LOGO: "LOGO",
  DISH: "DISH",
  VENUE_DAY: "VENUE_DAY",
  VENUE_NIGHT: "VENUE_NIGHT",
  PAST_VIDEO: "PAST_VIDEO",
  REFERENCE_IMAGE: "REFERENCE_IMAGE",
  REFERENCE_VIDEO: "REFERENCE_VIDEO",
} as const;

export type VideoMediaCategory = (typeof VIDEO_MEDIA_CATEGORIES)[keyof typeof VIDEO_MEDIA_CATEGORIES];

export const VIDEO_MEDIA_CATEGORY_LABELS: Record<VideoMediaCategory, string> = {
  LOGO: "شعار المطعم",
  DISH: "صور الأطباق",
  VENUE_DAY: "المكان نهارًا",
  VENUE_NIGHT: "المكان ليلًا",
  PAST_VIDEO: "فيديوهات سابقة",
  REFERENCE_IMAGE: "صور مرجعية",
  REFERENCE_VIDEO: "فيديو مرجعي",
};

export type MediaSource = "device" | "library" | "url" | "google_drive" | "dropbox";

export type StoryboardScene = {
  id: string;
  order: number;
  label: string;
  assetId: string | null;
};

export type VideoMediaAssetPublic = {
  id: string;
  category: string;
  name: string | null;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl: string | null;
  durationSec: number | null;
  source: string;
  isPrimary: boolean;
  createdAt: string;
};

export const MAX_REFERENCE_IMAGES = 20;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export const IMAGE_TO_VIDEO_PROVIDERS = new Set([
  "RUNWAY",
  "KLING",
  "GOOGLE_VEO",
  "LUMA",
  "PIKA",
  "HAILUO",
  "HEYGEN",
  "REPLICATE_VIDEO",
]);

export function estimateRunwayCostUsd(durationSec: number, sceneCount: number, modelId: string): number {
  const perSec = modelId === "gen4_turbo" ? 0.05 : 0.08;
  return Math.round(durationSec * Math.max(1, sceneCount) * perSec * 100) / 100;
}

/** Runway stores 0–1; some rows may already be 0–100. */
export function normalizeVideoJobProgress(progress: number | null | undefined): number | null {
  if (progress == null || Number.isNaN(progress)) return null;
  const n = progress > 0 && progress <= 1 ? progress * 100 : progress;
  return Math.min(100, Math.max(0, Math.round(n)));
}
