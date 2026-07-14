import type { MarketingPlatform } from "@prisma/client";
import type { AdsIntegrationKey } from "@/lib/platform/ads-integrations";

export type OwnerAdPlatform = {
  platform: MarketingPlatform;
  integrationKey: AdsIntegrationKey;
  labelAr: string;
  brandColor: string;
  logoLetter: string;
};

/** Owner-facing ad platforms — one card per provider */
export const OWNER_AD_PLATFORMS: OwnerAdPlatform[] = [
  { platform: "META", integrationKey: "META", labelAr: "Meta Ads", brandColor: "#0081FB", logoLetter: "M" },
  { platform: "GOOGLE", integrationKey: "GOOGLE", labelAr: "Google Ads", brandColor: "#4285F4", logoLetter: "G" },
  { platform: "TIKTOK", integrationKey: "TIKTOK", labelAr: "TikTok Ads", brandColor: "#010101", logoLetter: "T" },
  { platform: "SNAPCHAT", integrationKey: "SNAPCHAT", labelAr: "Snap Ads", brandColor: "#FFFC00", logoLetter: "S" },
  { platform: "LINKEDIN", integrationKey: "LINKEDIN", labelAr: "LinkedIn Ads", brandColor: "#0A66C2", logoLetter: "in" },
  { platform: "X", integrationKey: "X", labelAr: "X Ads", brandColor: "#000000", logoLetter: "X" },
  { platform: "PINTEREST", integrationKey: "PINTEREST", labelAr: "Pinterest Ads", brandColor: "#E60023", logoLetter: "P" },
];

export function ownerPlatformByKey(key: string): OwnerAdPlatform | undefined {
  return OWNER_AD_PLATFORMS.find((p) => p.platform === key.toUpperCase());
}
