"use client";

import { Badge } from "@/components/ui";
import { Star, Heart, X, Maximize2 } from "lucide-react";
import {
  embedAutoplayUrl,
  isEmbedVideo,
} from "@/lib/video";
import { itemName, type Locale } from "@/lib/i18n";
import {
  isVideoMedia,
  resolveVideoSrc,
} from "@/lib/video-playback";
import { PublicVideoPlayer } from "@/components/menu/public-video-player";

interface ProductMediaItem {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | string;
  previewUrl?: string;
  isFeatured: boolean;
}

interface ProductCardMediaProps {
  item: ProductMediaItem;
  locale: Locale;
  isFavorite: boolean;
  featuredLabel: string;
  onOpen: () => void;
  onFavorite: () => void;
}

export function ProductCardMedia({
  item,
  locale,
  isFavorite,
  featuredLabel,
  onOpen,
  onFavorite,
}: ProductCardMediaProps) {
  const hasVideo = isVideoMedia(item);
  const hasImage = !hasVideo && !!item.imageUrl;
  const videoSrc = resolveVideoSrc(item);

  if (!hasVideo && !hasImage) return null;

  return (
    <div className="relative block w-full overflow-hidden bg-gray-900 text-left">
      <div className="relative aspect-[16/10] w-full sm:aspect-video">
        {hasVideo && videoSrc && isEmbedVideo(videoSrc) ? (
          <button type="button" onClick={onOpen} className="block h-full w-full">
            <iframe
              src={embedAutoplayUrl(videoSrc)}
              title={itemName(item, locale)}
              className="pointer-events-none h-full w-full"
              allow="encrypted-media"
            />
          </button>
        ) : hasVideo && videoSrc ? (
          <div className="relative isolate h-full w-full">
            <PublicVideoPlayer
              item={item}
              locale={locale}
              controls
              tapToPlay
              className="object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="pointer-events-auto absolute bottom-3 left-3 z-[3] rounded-full bg-black/60 p-2 text-white"
              aria-label={locale === "ar" ? "تكبير" : "Expand"}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="block h-full w-full"
            aria-label={itemName(item, locale)}
          >
            <img
              src={item.imageUrl}
              alt={itemName(item, locale)}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </button>
        )}

        {hasVideo && (
          <span className="pointer-events-none absolute bottom-3 right-3 z-[3] rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            🎬
          </span>
        )}

        {item.isFeatured && (
          <Badge variant="warning" className="pointer-events-none absolute left-3 top-3 z-[3]">
            <Star className="h-3 w-3" />
            {featuredLabel}
          </Badge>
        )}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onFavorite();
            }
          }}
          className="pointer-events-auto absolute right-3 top-3 z-[3] rounded-full bg-white/90 p-2"
        >
          <Heart
            className={`h-4 w-4 ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
            }`}
          />
        </span>
      </div>
    </div>
  );
}

interface ProductMediaModalProps {
  item: ProductMediaItem;
  locale: Locale;
  open: boolean;
  onClose: () => void;
}

export function ProductMediaModal({
  item,
  locale,
  open,
  onClose,
}: ProductMediaModalProps) {
  if (!open) return null;

  const hasVideo = isVideoMedia(item);
  const videoSrc = resolveVideoSrc(item);
  const showImage = !hasVideo && !!item.imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-black sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full bg-black">
          {hasVideo && videoSrc && isEmbedVideo(videoSrc) ? (
            <iframe
              src={embedAutoplayUrl(videoSrc)}
              title={itemName(item, locale)}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : hasVideo && videoSrc ? (
            <PublicVideoPlayer
              item={item}
              locale={locale}
              controls
              tapToPlay
              className="object-contain"
            />
          ) : showImage ? (
            <img
              src={item.imageUrl}
              alt={itemName(item, locale)}
              className="h-full w-full object-contain"
            />
          ) : (
            <PublicVideoPlayer item={item} locale={locale} controls />
          )}

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-2 text-white"
            aria-label={locale === "ar" ? "إغلاق" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white px-4 py-3">
          <p className="font-semibold text-gray-900">{itemName(item, locale)}</p>
        </div>
      </div>
    </div>
  );
}
