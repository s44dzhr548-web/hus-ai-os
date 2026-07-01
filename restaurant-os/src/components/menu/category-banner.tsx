"use client";

import { PublicVideoPlayer } from "@/components/menu/public-video-player";
import { isVideoMedia, resolveVideoSrc } from "@/lib/video-playback";
import type { Locale } from "@/lib/i18n";

export type CategoryMediaType = "IMAGE" | "VIDEO";

interface CategoryBannerProps {
  mediaType?: CategoryMediaType | string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  previewUrl?: string | null;
  color?: string;
  icon?: string | null;
  title?: string;
  className?: string;
  locale?: Locale;
}

export function CategoryBanner({
  mediaType,
  imageUrl,
  videoUrl,
  previewUrl,
  color = "#047857",
  icon,
  title,
  className = "",
  locale = "ar",
}: CategoryBannerProps) {
  const item = {
    mediaType,
    videoUrl,
    previewUrl,
    imageUrl,
  };
  const showVideo = isVideoMedia(item) && !!resolveVideoSrc(item);
  const showImage = !showVideo && !!imageUrl;

  if (!showVideo && !showImage) return null;

  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ borderColor: color, borderWidth: showVideo || showImage ? 0 : 1 }}
    >
      {showVideo ? (
        <div className="h-40 w-full">
          <PublicVideoPlayer
            item={item}
            locale={locale}
            controls
            loop
            className="h-40 w-full object-cover"
          />
        </div>
      ) : (
        <img
          src={imageUrl!}
          alt={title || ""}
          className="h-32 w-full object-cover"
          loading="lazy"
        />
      )}
      {icon && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: color }}
        >
          <span>{icon}</span>
          {title && <span>{title}</span>}
        </div>
      )}
    </div>
  );
}

interface CategoryCustomizePreviewProps {
  mediaType: CategoryMediaType;
  imageUrl: string;
  videoUrl: string;
  color: string;
  icon: string;
  nameAr: string;
  layout: string;
}

export function CategoryCustomizePreview({
  mediaType,
  imageUrl,
  videoUrl,
  color,
  icon,
  nameAr,
  layout,
}: CategoryCustomizePreviewProps) {
  const hasMedia =
    (mediaType === "VIDEO" && !!videoUrl) || (mediaType === "IMAGE" && !!imageUrl);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700">معاينة قبل الحفظ</p>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {hasMedia ? (
          <CategoryBanner
            mediaType={mediaType}
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            color={color}
            icon={icon}
            title={nameAr}
          />
        ) : (
          <div
            className="flex h-32 items-center justify-center text-sm text-gray-400"
            style={{ backgroundColor: `${color}15` }}
          >
            {icon || "🍽️"} — اختر {mediaType === "VIDEO" ? "فيديو" : "صورة"} للمعاينة
          </div>
        )}
        <div className="p-3">
          <p className="font-semibold">{nameAr || "اسم القسم"}</p>
          <p className="mt-1 text-xs text-gray-500">
            نوع الوسائط: {mediaType === "VIDEO" ? "فيديو" : "صورة"} · العرض: {layout}
          </p>
        </div>
      </div>
    </div>
  );
}
