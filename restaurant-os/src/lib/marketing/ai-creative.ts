import prisma from "@/lib/prisma";
import type { MarketingCreativeType } from "@prisma/client";

export async function generateCreativeBrief(opts: {
  restaurantId: string;
  type: MarketingCreativeType;
  prompt?: string;
  season?: string;
}) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: {
      name: true,
      nameAr: true,
      primaryColor: true,
      welcomeText: true,
      logoUrl: true,
    },
  });

  const name = restaurant?.nameAr || restaurant?.name || "المطعم";
  const color = restaurant?.primaryColor || "#d4af37";

  const typeLabels: Partial<Record<MarketingCreativeType, string>> = {
    FOOD_IMAGE: "صورة طعام احترافية",
    POSTER: "بوستر ترويجي",
    STORY: "ستوري إنستغرام/سناب",
    INSTAGRAM_POST: "منشور إنستغرام مربع",
    TIKTOK_COVER: "غلاف فيديو تيك توك",
    FACEBOOK_AD: "إعلان فيسبوك",
    SNAPCHAT_AD: "إعلان سناب شات",
    FLYER: "منشور مطعم للطباعة",
    SEASONAL_RAMADAN: "حملة رمضان",
    SEASONAL_EID: "حملة العيد",
    SEASONAL_NATIONAL_DAY: "حملة اليوم الوطني",
    SEASONAL_SUMMER: "حملة صيف",
    SEASONAL_WINTER: "حملة شتاء",
  };

  const brief = {
    title: `${typeLabels[opts.type] || opts.type} — ${name}`,
    prompt:
      opts.prompt ||
      `Create ${typeLabels[opts.type]} for ${name}. Brand color: ${color}. ${opts.season ? `Season: ${opts.season}.` : ""} Style: premium restaurant, appetizing, Arabic-friendly.`,
    metadata: {
      restaurantName: name,
      brandColor: color,
      type: opts.type,
      season: opts.season,
      logoUrl: restaurant?.logoUrl,
      dimensions: getDimensions(opts.type),
    },
  };

  return brief;
}

function getDimensions(type: MarketingCreativeType): { w: number; h: number } {
  if (type.includes("STORY") || type === "STORY") return { w: 1080, h: 1920 };
  if (type === "INSTAGRAM_POST") return { w: 1080, h: 1080 };
  if (type === "TIKTOK_COVER") return { w: 1080, h: 1920 };
  if (type === "FACEBOOK_AD") return { w: 1200, h: 628 };
  return { w: 1080, h: 1080 };
}

export async function generateVideoBrief(opts: {
  restaurantId: string;
  type: MarketingCreativeType;
  durationSec: number;
  prompt?: string;
}) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { name: true, nameAr: true, heroVideoUrl: true },
  });
  const name = restaurant?.nameAr || restaurant?.name || "المطعم";

  return {
    title: `فيديو ${opts.durationSec}ث — ${name}`,
    prompt:
      opts.prompt ||
      `Restaurant promo video for ${name}, ${opts.durationSec} seconds, cinematic food shots, Arabic subtitles.`,
    voiceOver: `مرحباً بكم في ${name}. تجربة طعام لا تُنسى.`,
    subtitles: `[0-3s] ${name}\n[3-${opts.durationSec}s] اكتشف منيونا الحصري`,
    durationSec: opts.durationSec,
    metadata: { type: opts.type, heroReference: restaurant?.heroVideoUrl },
  };
}
