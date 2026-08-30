"use client";

import { useState } from "react";

export function VideoStudioMediaThumb({
  assetId,
  mimeType,
  alt = "",
  className = "h-24 w-full object-cover bg-stone-800",
}: {
  assetId: string;
  mimeType?: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isVideo = mimeType?.startsWith("video/");

  if (isVideo) {
    return (
      <div className={`flex items-center justify-center bg-stone-800 text-xs text-stone-400 ${className}`}>
        ▶ فيديو
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-stone-800 text-xs text-stone-500 ${className}`}>
        لا معاينة
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/marketing/creative/media-library/${assetId}/preview`}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
