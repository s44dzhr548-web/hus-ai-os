export const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

export const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v"]);

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_MB = 100;

/** Vercel serverless body limit — larger files use presigned R2 upload from the browser. */
export const VERCEL_FORM_UPLOAD_LIMIT = 4 * 1024 * 1024;

export function isAllowedVideoFile(file: File): boolean {
  if (file.type && VIDEO_MIME_TYPES.has(file.type)) return true;

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && VIDEO_EXTENSIONS.has(ext)) return true;

  // iPhone Safari may send empty type or application/octet-stream for .mov
  if (!file.type || file.type === "application/octet-stream") {
    return !!ext && VIDEO_EXTENSIONS.has(ext);
  }

  return false;
}

export function videoMimeForExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v") return "video/x-m4v";
  return "video/mp4";
}

/** Normalize iPhone/Safari empty or generic types to a proper video MIME. */
export function normalizeVideoContentType(filename: string, fileType?: string): string {
  const extMime = videoMimeForExtension(filename);
  if (!fileType || fileType === "application/octet-stream") return extMime;
  if (fileType.startsWith("video/")) return fileType;
  return extMime;
}

export function normalizeVideoFilename(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const validExt = ext && VIDEO_EXTENSIONS.has(ext) ? ext : "mp4";
  return `video-${Date.now()}.${validExt}`;
}
