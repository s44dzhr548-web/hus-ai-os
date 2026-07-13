export interface PopupBannerConfig {
  enabled: boolean;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  imageUrl: string;
  linkUrl: string;
  dismissible: boolean;
}

export interface HeroVideoConfig {
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  overlayOpacity: number;
}

export interface LandingPageConfig {
  heroVideo: HeroVideoConfig;
  popupBanner: PopupBannerConfig;
}

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  heroVideo: {
    autoplay: true,
    loop: true,
    muted: true,
    overlayOpacity: 45,
  },
  popupBanner: {
    enabled: false,
    titleAr: "",
    titleEn: "",
    messageAr: "",
    messageEn: "",
    imageUrl: "",
    linkUrl: "",
    dismissible: true,
  },
};

export function parseLandingPageConfig(raw: unknown): LandingPageConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_LANDING_PAGE_CONFIG };

  const o = raw as Record<string, unknown>;
  const hero = (o.heroVideo && typeof o.heroVideo === "object"
    ? o.heroVideo
    : {}) as Record<string, unknown>;
  const popup = (o.popupBanner && typeof o.popupBanner === "object"
    ? o.popupBanner
    : {}) as Record<string, unknown>;

  const overlay =
    typeof hero.overlayOpacity === "number"
      ? Math.min(70, Math.max(20, hero.overlayOpacity))
      : DEFAULT_LANDING_PAGE_CONFIG.heroVideo.overlayOpacity;

  return {
    heroVideo: {
      autoplay:
        typeof hero.autoplay === "boolean"
          ? hero.autoplay
          : DEFAULT_LANDING_PAGE_CONFIG.heroVideo.autoplay,
      loop:
        typeof hero.loop === "boolean"
          ? hero.loop
          : DEFAULT_LANDING_PAGE_CONFIG.heroVideo.loop,
      muted:
        typeof hero.muted === "boolean"
          ? hero.muted
          : DEFAULT_LANDING_PAGE_CONFIG.heroVideo.muted,
      overlayOpacity: overlay,
    },
    popupBanner: {
      enabled:
        typeof popup.enabled === "boolean"
          ? popup.enabled
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.enabled,
      titleAr:
        typeof popup.titleAr === "string"
          ? popup.titleAr
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.titleAr,
      titleEn:
        typeof popup.titleEn === "string"
          ? popup.titleEn
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.titleEn,
      messageAr:
        typeof popup.messageAr === "string"
          ? popup.messageAr
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.messageAr,
      messageEn:
        typeof popup.messageEn === "string"
          ? popup.messageEn
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.messageEn,
      imageUrl:
        typeof popup.imageUrl === "string"
          ? popup.imageUrl
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.imageUrl,
      linkUrl:
        typeof popup.linkUrl === "string"
          ? popup.linkUrl
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.linkUrl,
      dismissible:
        typeof popup.dismissible === "boolean"
          ? popup.dismissible
          : DEFAULT_LANDING_PAGE_CONFIG.popupBanner.dismissible,
    },
  };
}
