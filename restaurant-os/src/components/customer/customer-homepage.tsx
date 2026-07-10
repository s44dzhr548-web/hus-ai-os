"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerBranding } from "@/lib/restaurant-branding";
import type { HomepageSectionId } from "@/lib/homepage-sections";
import { SECTION_ICONS } from "@/lib/homepage-sections";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

interface CustomerHomepageProps {
  branding: CustomerBranding;
  restaurantName: string;
  restaurantNameEn: string;
  slug: string;
  tableId?: string | null;
  tableNumber?: number | null;
  whatsappNumber?: string | null;
  locale?: "ar" | "en";
}

function sectionHref(
  id: HomepageSectionId,
  slug: string,
  tableId: string | null | undefined,
  whatsapp: string | null | undefined,
  name: string
): string {
  switch (id) {
    case "menu":
      return tableId ? `/menu/${tableId}` : `/r/${slug}`;
    case "reservations":
      return whatsapp
        ? buildWhatsAppOrderLink(whatsapp, {
            orderNumber: 0,
            totalAmount: 0,
            items: [{ name: "حجز طاولة", quantity: 1 }],
          })
        : "#";
    case "offers":
      return tableId ? `/menu/${tableId}?view=offers` : `/r/${slug}`;
    case "events":
    case "wishes":
    case "gift":
      if (whatsapp) {
        const labels: Record<string, string> = {
          events: "استفسار عن حفلة",
          wishes: "أمنية خاصة",
          gift: "طلب إهداء",
        };
        return buildWhatsAppOrderLink(whatsapp, {
          orderNumber: 0,
          totalAmount: 0,
          items: [{ name: labels[id] || name, quantity: 1 }],
        });
      }
      return "#";
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
  whatsappNumber,
  locale = "ar",
}: CustomerHomepageProps) {
  const [lang, setLang] = useState(locale);
  const displayName = lang === "en" ? restaurantNameEn || restaurantName : restaurantName;
  const welcome = lang === "en" ? branding.welcomeTextEn || branding.welcomeText : branding.welcomeText;
  const cta = lang === "en" ? branding.ctaTextEn || branding.ctaText : branding.ctaText;

  const heroMedia = branding.heroVideoUrl || branding.heroImageUrl;
  const isVideo = !!branding.heroVideoUrl;

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

  const menuHref = tableId ? `/menu/${tableId}` : `/r/${slug}`;

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-x-hidden"
      style={{
        ...cssVars,
        backgroundColor: branding.backgroundColor,
        color: branding.textColor,
        fontFamily: branding.fontCss,
      }}
    >
      {/* Hero */}
      <section className="relative h-[min(72vh,640px)] w-full overflow-hidden">
        {isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={branding.heroVideoUrl!}
            autoPlay
            muted
            loop
            playsInline
            poster={branding.heroImageUrl || undefined}
          />
        ) : heroMedia ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroMedia}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${branding.backgroundColor} 0%, ${branding.secondaryColor}33 50%, ${branding.primaryColor}22 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-[var(--brand-bg)]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end px-4 pb-10 pt-16 text-center">
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs text-white backdrop-blur-md transition hover:bg-black/50"
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>

          {branding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={displayName}
              className="mb-4 h-20 w-20 rounded-full border-2 object-cover shadow-2xl"
              style={{ borderColor: branding.primaryColor }}
            />
          )}

          <h1
            className="text-3xl font-bold tracking-wide drop-shadow-lg sm:text-4xl md:text-5xl"
            style={{ color: branding.textColor }}
          >
            {displayName}
          </h1>

          {tableNumber != null && (
            <p className="mt-2 text-sm opacity-80">
              {lang === "ar" ? `طاولة ${tableNumber}` : `Table ${tableNumber}`}
            </p>
          )}

          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed opacity-90 sm:text-lg">
            {welcome}
          </p>

          <Link
            href={menuHref}
            className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-full px-10 py-3 text-base font-semibold text-[#0c0a09] shadow-lg transition hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.buttonColor})`,
              boxShadow: `0 8px 32px ${branding.primaryColor}55`,
            }}
          >
            {cta}
          </Link>
        </div>
      </section>

      {/* Section cards */}
      <section className="relative z-10 -mt-6 px-4 pb-12 pt-2">
        <div className="mx-auto grid max-w-lg gap-4 sm:max-w-2xl sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
          {branding.sections.map((section) => {
            const href = sectionHref(
              section.id,
              slug,
              tableId,
              whatsappNumber,
              section.titleAr
            );
            const title = lang === "en" ? section.titleEn : section.titleAr;
            const external = href.startsWith("http");

            const inner = (
              <>
                <span className="text-3xl" aria-hidden>
                  {SECTION_ICONS[section.id]}
                </span>
                <span className="mt-3 text-lg font-semibold">{title}</span>
                <span
                  className="mt-1 text-xs opacity-70"
                  style={{ color: branding.primaryColor }}
                >
                  {lang === "ar" ? "اضغط للمتابعة" : "Tap to continue"}
                </span>
              </>
            );

            const className = `${cardClass(branding.cardStyle)} group flex min-h-[140px] flex-col items-center justify-center rounded-2xl p-5 text-center transition duration-300 hover:-translate-y-1 hover:shadow-2xl`;

            if (external) {
              return (
                <a
                  key={section.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                  style={{ borderColor: `${branding.primaryColor}44` }}
                >
                  {inner}
                </a>
              );
            }

            return (
              <Link
                key={section.id}
                href={href}
                className={className}
                style={{ borderColor: `${branding.primaryColor}44` }}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="pb-8 text-center text-xs opacity-50">
        Powered by Menu OS
      </footer>
    </div>
  );
}
