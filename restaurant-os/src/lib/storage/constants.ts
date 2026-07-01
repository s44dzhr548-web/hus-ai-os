export const PERMANENT_STORAGE_MESSAGE = "التخزين الدائم غير مفعل";

/** @deprecated use PERMANENT_STORAGE_MESSAGE */
export const BLOB_SETUP_MESSAGE = PERMANENT_STORAGE_MESSAGE;

export function isPermanentMediaUrl(url: string): boolean {
  if (!url) return false;
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!publicBase) return false;
  try {
    const parsed = new URL(url);
    const base = new URL(publicBase);
    return parsed.origin === base.origin && parsed.pathname.startsWith(base.pathname || "/");
  } catch {
    return url.startsWith(publicBase);
  }
}

/** @deprecated use isPermanentMediaUrl */
export function isBlobMediaUrl(url: string): boolean {
  return isPermanentMediaUrl(url);
}

export function isLegacyMediaUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("/api/media/") ||
    url.includes("/uploads/") ||
    url.includes("blob.vercel-storage.com")
  );
}
