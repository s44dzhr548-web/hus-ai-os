import { normalizeHex } from "@/lib/colors";
import { fontCss } from "@/lib/restaurant-links";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  parseHomepageSections,
  type HomepageSectionConfig,
} from "@/lib/homepage-sections";

export type CardStyle = "glass" | "solid" | "outline";

export interface CustomerBranding {
  logoUrl: string | null;
  heroVideoUrl: string | null;
  heroImageUrl: string | null;
  coverUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  categoryColor: string;
  fontFamily: string;
  fontCss: string;
  cardStyle: CardStyle;
  welcomeText: string;
  welcomeTextEn: string;
  ctaText: string;
  ctaTextEn: string;
  sections: HomepageSectionConfig[];
}

type RestaurantBrandingRow = {
  logoUrl?: string | null;
  coverUrl?: string | null;
  heroVideoUrl?: string | null;
  heroImageUrl?: string | null;
  welcomeText?: string | null;
  welcomeTextEn?: string | null;
  ctaText?: string | null;
  ctaTextEn?: string | null;
  cardStyle?: string | null;
  homepageSections?: unknown;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  buttonColor?: string | null;
  textColor?: string | null;
  categoryColor?: string | null;
  fontFamily?: string | null;
  name?: string;
  nameAr?: string | null;
  nameEn?: string | null;
};

export function resolveCustomerBranding(
  restaurant: RestaurantBrandingRow,
  locale: "ar" | "en" = "ar"
): CustomerBranding {
  const name =
    locale === "en"
      ? restaurant.nameEn || restaurant.nameAr || restaurant.name || ""
      : restaurant.nameAr || restaurant.name || "";

  return {
    logoUrl: restaurant.logoUrl ?? null,
    heroVideoUrl: restaurant.heroVideoUrl ?? null,
    heroImageUrl: restaurant.heroImageUrl ?? restaurant.coverUrl ?? null,
    coverUrl: restaurant.coverUrl ?? null,
    primaryColor: normalizeHex(restaurant.primaryColor || "#d4af37"),
    secondaryColor: normalizeHex(restaurant.secondaryColor || "#8b6914"),
    backgroundColor: normalizeHex(restaurant.backgroundColor || "#0c0a09"),
    textColor: normalizeHex(restaurant.textColor || "#faf7f2"),
    buttonColor: normalizeHex(restaurant.buttonColor || "#c9a227"),
    categoryColor: normalizeHex(restaurant.categoryColor || "#d4af37"),
    fontFamily: restaurant.fontFamily || "cairo",
    fontCss: fontCss(restaurant.fontFamily),
    cardStyle: (["glass", "solid", "outline"].includes(restaurant.cardStyle || "")
      ? restaurant.cardStyle
      : "glass") as CardStyle,
    welcomeText:
      (locale === "en"
        ? restaurant.welcomeTextEn || restaurant.welcomeText
        : restaurant.welcomeText) ||
      (locale === "en" ? `Welcome to ${name}` : `مرحباً بكم في ${name}`),
    welcomeTextEn: restaurant.welcomeTextEn || `Welcome to ${name}`,
    ctaText:
      (locale === "en" ? restaurant.ctaTextEn || restaurant.ctaText : restaurant.ctaText) ||
      (locale === "en" ? "Explore Menu" : "استكشف المنيو"),
    ctaTextEn: restaurant.ctaTextEn || "Explore Menu",
    sections: parseHomepageSections(restaurant.homepageSections).filter((s) => s.enabled),
  };
}

export const DEFAULT_BRANDING_FORM = {
  logoUrl: "",
  coverUrl: "",
  heroVideoUrl: "",
  heroImageUrl: "",
  welcomeText: "",
  welcomeTextEn: "",
  ctaText: "استكشف المنيو",
  ctaTextEn: "Explore Menu",
  cardStyle: "glass" as CardStyle,
  primaryColor: "#d4af37",
  secondaryColor: "#8b6914",
  backgroundColor: "#0c0a09",
  buttonColor: "#c9a227",
  textColor: "#faf7f2",
  categoryColor: "#d4af37",
  fontFamily: "cairo",
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
};

export const BRANDING_SELECT = {
  logoUrl: true,
  coverUrl: true,
  heroVideoUrl: true,
  heroImageUrl: true,
  welcomeText: true,
  welcomeTextEn: true,
  ctaText: true,
  ctaTextEn: true,
  cardStyle: true,
  homepageSections: true,
  primaryColor: true,
  secondaryColor: true,
  backgroundColor: true,
  buttonColor: true,
  textColor: true,
  categoryColor: true,
  fontFamily: true,
  name: true,
  nameAr: true,
  nameEn: true,
  whatsappNumber: true,
} as const;
