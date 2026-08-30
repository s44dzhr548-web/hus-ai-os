import { normalizeVideoJobProgress } from "@/lib/marketing/video-studio-types";

export type VideoJobStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | string;

export function jobStatusLabel(status: VideoJobStatus): string {
  switch (status) {
    case "PENDING":
      return "قيد الانتظار";
    case "PROCESSING":
      return "قيد المعالجة";
    case "SUCCEEDED":
      return "مكتمل";
    case "FAILED":
      return "فشل";
    default:
      return status;
  }
}

export function jobStatusTone(status: VideoJobStatus): string {
  switch (status) {
    case "SUCCEEDED":
      return "text-emerald-400 bg-emerald-950/40 border-emerald-800";
    case "FAILED":
      return "text-red-400 bg-red-950/40 border-red-900";
    case "PROCESSING":
      return "text-amber-300 bg-amber-950/30 border-amber-800";
    default:
      return "text-stone-300 bg-stone-900/60 border-stone-700";
  }
}

/** Runway returns 0–1; older rows may store 0–100. */
export const normalizeProgress = normalizeVideoJobProgress;

export function formatJobDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function mediaPreviewUrl(assetId: string): string {
  return `/api/marketing/creative/media-library/${assetId}/preview`;
}

export function providerDisplayName(key: string, providers: { key: string; nameAr: string; nameEn: string }[]): string {
  const p = providers.find((x) => x.key === key);
  return p?.nameAr || p?.nameEn || key;
}

export function resolveVideoUrl(job: {
  finalOutputUrl?: string | null;
  outputUrl?: string | null;
  rawOutputUrl?: string | null;
}): string | null {
  return job.finalOutputUrl ?? job.outputUrl ?? job.rawOutputUrl ?? null;
}
