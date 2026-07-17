"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CustomerBranding } from "@/lib/restaurant-branding";
import type { HomepageSectionId } from "@/lib/homepage-sections";
import { SECTION_LUCIDE_ICONS, FEATURE_SECTION_EMOJI } from "@/lib/homepage-sections";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { Clock, Star, X } from "lucide-react";

export interface CustomerHomepageContext {
  branchName?: string | null;
  branchNameEn?: string | null;
  workingHoursLabel?: string | null;
  rating?: number | null;
  ratingCount?: number;
  phone?: string | null;
}

interface CustomerHomepageProps {
  branding: CustomerBranding;
  restaurantName: string;
  restaurantNameEn: string;
  slug: string;
  tableId?: string | null;
  tableNumber?: number | null;
  hasActiveSession?: boolean;
  whatsappNumber?: string | null;
  locale?: "ar" | "en";
  context?: CustomerHomepageContext;
}

function sectionHref(
  id: HomepageSectionId,
  slug: string,
  tableId: string | null | undefined,
  hasActiveSession: boolean,
  whatsapp: string | null | undefined,
  name: string
): string {
  switch (id) {
    case "menu":
      return tableId ? `/menu/${tableId}?direct=1` : `/r/${slug}`;
    case "reservations":
      return `/r/${slug}/reserve${tableId ? `?table=${tableId}` : ""}`;
    case "offers":
      return tableId ? `/menu/${tableId}?direct=1&view=offers` : `/r/${slug}`;
    case "branches":
      return `/r/${slug}/branches`;
    case "track_order":
      return `/r/${slug}/track-order`;
    case "rate_visit":
      return `/r/${slug}/rate${tableId ? `?table=${tableId}` : ""}`;
    case "contact":
      return `/r/${slug}/contact`;
    case "whatsapp":
      if (whatsapp) {
        return buildWhatsAppOrderLink(whatsapp, {
          orderNumber: 0,
          totalAmount: 0,
          items: [{ name: "استفسار", quantity: 1 }],
        });
      }
      return "#";
    case "events":
      if (whatsapp) {
        return buildWhatsAppOrderLink(whatsapp, {
          orderNumber: 0,
          totalAmount: 0,
          items: [{ name: "استفسار عن حفلة", quantity: 1 }],
        });
      }
      return "#";
    case "gift":
      if (tableId && hasActiveSession) return `/gift/${tableId}`;
      return `/r/${slug}/gifts${tableId ? `?table=${tableId}` : ""}`;
    case "wishes":
      return `/r/${slug}/wishes${tableId ? `?table=${tableId}` : ""}`;
    case "song_request":
      return `/r/${slug}/song-request${tableId ? `?table=${tableId}` : ""}`;
    default:
      return "#";
  }
}

function cardClass(style: CustomerBranding["cardStyle"]) {
  if (style === "solid") {
    return "border border-white/10 bg-white/10 shadow-lg backdrop-blur-sm";
  }
  if (style === "outline") {
    return "border-2 bg-transparent shadow-none backdrop-blur-none";
  }
  return "border border-white/20 bg-white/10 shadow-xl backdrop-blur-md";
}

export function CustomerHomepage({
  branding,
  restaurantName,
  restaurantNameEn,
  slug,
  tableId,
  tableNumber,
  hasActiveSession = false,
  whatsappNumber,
  locale = "ar",
  context = {},
}: CustomerHomepageProps) {
  const [lang, setLang] = useState(locale);
  const [popupOpen, setPopupOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const displayName = lang === "en" ? restaurantNameEn || restaurantName : restaurantName;
  const welcome =
    lang === "en" ? branding.welcomeTextEn || branding.welcomeText : branding.welcomeText;
  const branchLabel =
    lang === "en"
      ? context.branchNameEn || context.branchName
      : context.branchName || context.branchNameEn;

  const heroVideo = branding.landingConfig.heroVideo;
  const popup = branding.landingConfig.popupBanner;
  const overlayOpacity = heroVideo.overlayOpacity / 100;
  const isVideo = !!branding.heroVideoUrl;
  const fallbackImage = branding.heroImageUrl || branding.coverUrl;

  useEffect(() => {
    setMounted(true);
    if (popup.enabled && (popup.titleAr || popup.messageAr || popup.imageUrl)) {
      const key = `landing-popup-${slug}`;
      if (!sessionStorage.getItem(key)) {
        setPopupOpen(true);
        sessionStorage.setItem(key, "1");
      }
    }
  }, [popup, slug]);

  const cssVars = useMemo(
    () =>
      ({
        "--brand-primary": branding.primaryColor,
        "--brand-secondary": branding.secondaryColor,
        "--brand-bg": branding.backgroundColor,
        "--brand-text": branding.textColor,
        "--brand-button": branding.buttonColor,
      }) as React.CSSProperties,
    [branding]
  );

  const menuHref = tableId ? `/menu/${tableId}?direct=1` : `/r/${slug}`;

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="relative min-h-[100dvh] overflow-x-hidden"
      style={{
        ...cssVars,
        backgroundColor: branding.backgroundColor,
        color: branding.textColor,
        fontFamily: branding.fontCss,
      }}
    >
      {/* Full-screen hero background */}
      <div className="fixed inset-0 z-0">
        {isVideo ? (
          <video
            className="h-full w-full object-cover"
            src={branding.heroVideoUrl!}
            autoPlay={heroVideo.autoplay}
            muted={heroVideo.muted}
            loop={heroVideo.loop}
            playsInline
            poster={fallbackImage || undefined}
          />
        ) : fallbackImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fallbackImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${branding.backgroundColor} 0%, ${branding.secondaryColor}55 50%, ${branding.primaryColor}33 100%)`,
            }}
          />
        )}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      </div>

      {/* Header */}
      <header
        className={`relative z-20 px-4 pt-4 transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
      >
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {branding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={displayName}
                className="h-12 w-12 shrink-0 rounded-full border-2 object-cover shadow-lg sm:h-14 sm:w-14"
                style={{ borderColor: branding.primaryColor }}
              />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold drop-shadow-md sm:text-xl">
                {displayName}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-90">
                {context.rating != null && context.rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {context.rating.toFixed(1)}
                    {context.ratingCount ? (
                      <span className="opacity-70">({context.ratingCount})</span>
                    ) : null}
                  </span>
                )}
                {context.workingHoursLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {context.workingHoursLabel}
                  </span>
                )}
                {branchLabel && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 backdrop-blur-sm">
                    {branchLabel}
                    {tableNumber != null
                      ? ` · ${lang === "ar" ? "طاولة" : "Table"} ${tableNumber}`
                      : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="shrink-0 rounded-full border border-white/30 bg-black/30 px-3 py-1.5 text-xs text-white backdrop-blur-md transition hover:bg-black/50"
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-8 pt-6">
        <div className="flex flex-1 flex-col items-center justify-end">
          <p
            className={`mb-6 max-w-md text-center text-base leading-relaxed opacity-95 sm:text-lg transition-all duration-700 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            {welcome}
          </p>

          <Link
            href={menuHref}
            className={`mb-8 inline-flex min-h-[52px] items-center justify-center rounded-full px-12 py-3.5 text-base font-semibold text-[#0c0a09] shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:brightness-110 active:scale-[0.98] delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.buttonColor})`,
              boxShadow: `0 8px 40px ${branding.primaryColor}66`,
            }}
          >
            {lang === "en" ? branding.ctaTextEn : branding.ctaText}
          </Link>

          {/* Action grid — 2 cols mobile, 4 cols desktop */}
          <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-3 sm:max-w-4xl sm:grid-cols-4 sm:gap-4">
            {branding.sections.map((section, index) => {
              const href = sectionHref(
                section.id,
                slug,
                tableId,
                hasActiveSession,
                whatsappNumber,
                section.titleAr
              );
              const title = lang === "en" ? section.titleEn : section.titleAr;
              const external = href.startsWith("http") || href === "#";
              const disabled = href === "#";
              const Icon = SECTION_LUCIDE_ICONS[section.id];
              const emoji = FEATURE_SECTION_EMOJI[section.id];

              const inner = (
                <>
                  {emoji ? (
                    <span className="text-2xl sm:text-3xl" aria-hidden>
                      {emoji}
                    </span>
                  ) : (
                    <Icon
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      style={{ color: branding.primaryColor }}
                      aria-hidden
                    />
                  )}
                  <span className="mt-2 text-sm font-semibold leading-tight sm:text-base">
                    {title}
                  </span>
                </>
              );

              const className = `${cardClass(branding.cardStyle)} group flex min-h-[108px] flex-col items-center justify-center rounded-2xl p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-[var(--brand-primary)]/50 sm:min-h-[120px] ${disabled ? "pointer-events-none opacity-50" : ""}`;
              const style = {
                borderColor: `${branding.primaryColor}44`,
                animationDelay: `${index * 60 + 300}ms`,
              };
              const animClass = mounted
                ? "animate-[fadeUp_0.6s_ease-out_both]"
                : "opacity-0";

              if (external && !disabled) {
                return (
                  <a
                    key={section.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${className} ${animClass}`}
                    style={style}
                  >
                    {inner}
                  </a>
                );
              }

              return (
                <Link
                  key={section.id}
                  href={href}
                  className={`${className} ${animClass}`}
                  style={style}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>

        <footer className="relative z-10 mt-10 text-center text-xs opacity-40">
          Powered by Menu OS
        </footer>
      </main>

      {/* Popup banner */}
      {popupOpen && popup.enabled && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="relative w-full max-w-md animate-[scaleIn_0.35s_ease-out] overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
            style={{ backgroundColor: branding.backgroundColor }}
          >
            {popup.dismissible && (
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="absolute left-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {popup.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={popup.imageUrl}
                alt=""
                className="h-40 w-full object-cover"
              />
            )}
            <div className="p-5">
              <h2 className="text-lg font-bold">
                {lang === "en" ? popup.titleEn || popup.titleAr : popup.titleAr || popup.titleEn}
              </h2>
              {(popup.messageAr || popup.messageEn) && (
                <p className="mt-2 text-sm opacity-85">
                  {lang === "en"
                    ? popup.messageEn || popup.messageAr
                    : popup.messageAr || popup.messageEn}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                {popup.linkUrl ? (
                  <a
                    href={popup.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-full py-2.5 text-center text-sm font-semibold text-[#0c0a09]"
                    style={{ background: branding.primaryColor }}
                  >
                    {lang === "ar" ? "عرض التفاصيل" : "View details"}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPopupOpen(false)}
                  className="flex-1 rounded-full border border-white/20 py-2.5 text-sm font-medium transition hover:bg-white/5"
                >
                  {lang === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
