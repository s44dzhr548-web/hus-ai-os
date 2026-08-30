import prisma from "@/lib/prisma";
import { canManageProviderSecrets } from "@/lib/marketing/providers/permissions";
import type { Session } from "next-auth";

export type LogoPosition =
  | "top_right"
  | "top_left"
  | "bottom_right"
  | "bottom_left"
  | "bottom_center";

export type LogoTiming = "start" | "end" | "full" | "start_and_end";

export type VideoBrandPayload = {
  restaurantName: string;
  showRestaurantName: boolean;
  logoUrl: string | null;
  logoPosition: LogoPosition;
  logoTiming: LogoTiming;
  headline: string;
  subheadline: string;
  cta: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  referenceType?: "dish" | "restaurant" | "product" | "video" | null;
  referenceDataUri?: string | null;
};

export type StudioBrandContext = {
  restaurantId: string;
  restaurantName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  defaultLogoPosition: LogoPosition;
  defaultLogoTiming: LogoTiming;
  defaultCTA: string;
  canEditBrandDefaults: boolean;
};

const DEFAULT_CTA = "احجز الآن";

export async function getStudioBrandContext(
  restaurantId: string,
  session: Session
): Promise<StudioBrandContext> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      nameAr: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      textColor: true,
    },
  });

  if (!restaurant) throw new Error("المطعم غير موجود");

  const saved = await prisma.marketingVideoBrandSettings.findUnique({
    where: { restaurantId },
  });

  const restaurantName = saved?.restaurantName ?? restaurant.nameAr ?? restaurant.name;
  const logoUrl = saved?.logoUrl ?? restaurant.logoUrl ?? null;

  return {
    restaurantId,
    restaurantName,
    logoUrl,
    primaryColor: saved?.primaryColor ?? restaurant.primaryColor ?? "#d4af37",
    secondaryColor: saved?.secondaryColor ?? restaurant.secondaryColor ?? "#8b6914",
    textColor: saved?.textColor ?? restaurant.textColor ?? "#ffffff",
    defaultLogoPosition: (saved?.defaultLogoPosition as LogoPosition) ?? "bottom_right",
    defaultLogoTiming: (saved?.defaultLogoTiming as LogoTiming) ?? "end",
    defaultCTA: saved?.defaultCTA ?? DEFAULT_CTA,
    canEditBrandDefaults: canManageProviderSecrets(session),
  };
}

export async function saveVideoBrandDefaults(
  restaurantId: string,
  data: {
    restaurantName?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    textColor?: string;
    defaultLogoPosition?: LogoPosition;
    defaultLogoTiming?: LogoTiming;
    defaultCTA?: string;
  }
) {
  await prisma.marketingVideoBrandSettings.upsert({
    where: { restaurantId },
    create: { restaurantId, ...data },
    update: data,
  });
}

export function buildRunwayScenePrompt(userPrompt: string, opts?: { multiImage?: boolean; sceneIndex?: number }): string {
  const base = userPrompt.trim();
  const identity =
    opts?.multiImage
      ? " Maintain exact restaurant identity, decor, signage, and ambiance from the reference image. Do not invent new logos, change interior design, or replace branding. "
      : " ";
  const sceneNote =
    typeof opts?.sceneIndex === "number"
      ? ` This is storyboard scene ${opts.sceneIndex + 1}. Smooth cinematic transition from previous scene if applicable.`
      : "";
  return `${base}.${identity}Professional restaurant marketing b-roll. No visible text, logos, or watermarks in the scene. Leave clean areas for post-production branding overlay.${sceneNote}`;
}

export function enrichPromptWithReferenceImages(userPrompt: string, imageCount: number): string {
  if (imageCount <= 1) return userPrompt.trim();
  return `${userPrompt.trim()}\n\n[Storyboard: ${imageCount} reference images — preserve restaurant identity across all scenes; automatic transitions between dish, venue, and brand shots without altering decor or logo.]`;
}

export function pickReferenceForRunway(brand: VideoBrandPayload): {
  mode: "text_to_video" | "image_to_video";
  promptImageDataUri?: string;
} {
  if (brand.referenceDataUri?.startsWith("data:image/")) {
    return { mode: "image_to_video", promptImageDataUri: brand.referenceDataUri };
  }
  return { mode: "text_to_video" };
}
