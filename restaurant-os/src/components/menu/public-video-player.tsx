"use client";

import { useEffect, useRef, useState } from "react";
import {
  mapMediaErrorToPlaybackError,
  resolveVideoPoster,
  resolveVideoSrc,
  videoErrorMessage,
  type ProductVideoFields,
  type VideoPlaybackError,
} from "@/lib/video-playback";
import { isLegacyMediaUrl } from "@/lib/storage/constants";
import { MOV_COMPAT_WARNING } from "@/lib/r2-client-upload";
import type { Locale } from "@/lib/i18n";

function isMovUrl(url: string): boolean {
  return /\.mov(\?|$)/i.test(url) || url.includes("video/quicktime");
}

interface PublicVideoPlayerProps {
  item: ProductVideoFields;
  locale?: Locale;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  tapToPlay?: boolean;
  onReady?: () => void;
  onFail?: (error: VideoPlaybackError) => void;
}

export function PublicVideoPlayer({
  item,
  locale = "ar",
  className = "h-full w-full object-cover",
  controls = true,
  autoPlay = false,
  loop = false,
  tapToPlay = true,
  onReady,
  onFail,
}: PublicVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<VideoPlaybackError | null>(null);
  const [checking, setChecking] = useState(true);
  const src = resolveVideoSrc(item);
  const poster = resolveVideoPoster(item);

  useEffect(() => {
    setError(null);
    setChecking(!!src);

    if (!src) {
      setChecking(false);
      onFail?.("missing");
      return;
    }

    if (isLegacyMediaUrl(src)) {
      setError("storage");
      setChecking(false);
      onFail?.("storage");
      return;
    }
  }, [src, onFail]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }, [src]);

  useEffect(() => {
    if (!checking) return;
    const timeout = window.setTimeout(() => setChecking(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [checking, src]);

  function handleVideoError() {
    const el = videoRef.current;
    const code = mapMediaErrorToPlaybackError(undefined, el?.error?.code);
    setError(code);
    setChecking(false);
    onFail?.(code);
  }

  function handleLoaded() {
    setChecking(false);
    setError(null);
    onReady?.();
  }

  function handleVideoTap(e: React.MouseEvent<HTMLVideoElement>) {
    e.stopPropagation();
    if (!tapToPlay) return;
    const el = e.currentTarget;
    if (el.paused) {
      void el.play().catch(() => {});
    }
  }

  if (!src) {
    return (
      <VideoErrorPanel
        message={videoErrorMessage("missing", locale)}
        locale={locale}
      />
    );
  }

  if (error) {
    return (
      <VideoErrorPanel
        message={videoErrorMessage(error, locale)}
        detail={src}
        locale={locale}
      />
    );
  }

  return (
    <div className="relative h-full w-full touch-manipulation">
      {checking && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/30 text-xs text-white">
          {locale === "ar" ? "جاري تحميل الفيديو..." : "Loading video..."}
        </div>
      )}
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster}
        controls={controls}
        playsInline
        muted={autoPlay}
        autoPlay={autoPlay}
        loop={loop}
        preload="metadata"
        className={`relative z-[2] block h-full w-full touch-manipulation ${className}`}
        onClick={handleVideoTap}
        onError={handleVideoError}
        onLoadedMetadata={handleLoaded}
        onLoadedData={handleLoaded}
        onCanPlay={handleLoaded}
      />
      {isMovUrl(src) && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-center text-xs text-amber-800">
          {MOV_COMPAT_WARNING}
        </p>
      )}
    </div>
  );
}

function VideoErrorPanel({
  message,
  detail,
  locale,
}: {
  message: string;
  detail?: string;
  locale: Locale;
}) {
  return (
    <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 bg-gray-900 p-4 text-center">
      <span className="text-2xl">🎬</span>
      <p className="text-sm font-medium text-red-300">{message}</p>
      {detail && (
        <p className="max-w-full break-all font-mono text-[10px] text-gray-500" dir="ltr">
          {detail}
        </p>
      )}
      <p className="text-xs text-gray-400">
        {locale === "ar"
          ? "من لوحة المنيو: ارفع MP4 أو MOV واحفظ mediaType = فيديو"
          : "Owner: upload MP4/MOV and save with mediaType = video"}
      </p>
    </div>
  );
}
