"use client";

import { buildGoogleMapsDirectionsUrl } from "@/lib/google-maps-embed";

type Props = {
  embedSrc: string;
  directionsLabel?: string;
  className?: string;
};

export function GoogleMapsEmbedSection({
  embedSrc,
  directionsLabel = "الاتجاهات إلى المطعم",
  className = "",
}: Props) {
  const src = embedSrc.trim();
  if (!src) return null;

  const directionsUrl = buildGoogleMapsDirectionsUrl(src);

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-lg">
        <div className="relative aspect-[4/3] w-full sm:aspect-video">
          <iframe
            title="موقع المطعم على الخريطة"
            src={src}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15 sm:w-auto"
      >
        <span aria-hidden>📍</span>
        {directionsLabel}
      </a>
    </section>
  );
}
