export const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export const MAX_IMAGE_MB = 5;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

export function isAllowedImageFile(file: File): boolean {
  if (IMAGE_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.has(ext);
}
